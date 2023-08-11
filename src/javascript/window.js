/*
 * This file is part of the Goobi viewer - a content presentation and management
 * application for digitized objects.
 *
 * Visit these websites for more information.
 *          - http://www.intranda.com
 *          - http://digiverso.com
 *
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation; either version 2 of the License, or (at your option) any later
 * version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program. If not, see <http://www.gnu.org/licenses/>.
 */
 /**
 Main logic for application window
 Sets up main window containing the menu bar and the browser view containing the external viewer resource
 **/

const { app, BrowserWindow, BrowserView} = require('electron');
const path = require('path');
const config = require('../configs/app.config');
const rxjs = require('rxjs');
const operators = require('rxjs/operators');
const buildMenu = require('./menu')
const i18n = require('../configs/i18next.config.js');
const { ipcMain } = require("electron");
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

//height of the menu bar. Required to position browser view and dropdown menu items
const TITLEBAR_HEIGHT = 25; // px


module.exports = async function createWindow (machineId) {

  console.log("viewer client config: ", config);
  console.log("viewer client machine Id: ", machineId);

  //main application window containing the menu bar and browser view
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: getIconPath(config.icon),
    title: config.title,
    frame: true,
	webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
	  preload: path.join(__dirname, "preload.js") // use a preload script
    }
  })
  //browser view in which the viewer is loaded
  const view = new BrowserView({
  	webPreferences: {
      nodeIntegration: false,
      contextIsolation: false
    }
  })

	//hide default menu. We build our own
    win.removeMenu();

    //init event listeners now and in this order to correctly initialize languages on first page
	initWebListeners(win);
	initRendererEvents(win);
  	initContentProtection(win, view, machineId);
	
	//set the browser view within the main window and position it
  	win.setBrowserView(view);
  	await win.loadFile(path.join(__dirname, "../../assets/html/menubar.html"))
  	setViewBounds(win, view);
  	win.on("resize", () => setTimeout(() => setViewBounds(win, view), 0));

	//load the viewer URL
  	view.webContents.loadURL(config.viewerUrl);
  	
  	//Handle opening a new window when clicking on a link with a target attribute
  	win.getBrowserView().webContents.setWindowOpenHandler(({url}) => {
	  return { 
		  action: 'allow',
		  overrideBrowserWindowOptions: {
			icon: getIconPath(config.icon),
		    title: config.title,
		    frame: true,
		    autoHideMenuBar: true,
			webPreferences: {
		      nodeIntegration: false,
		      contextIsolation: false,
		    }
		  }
	   };
  });

  
}

//set the bounds of the browser view within the main window. Must be called each time the window is resized
function setViewBounds(win, view) {
	const contentBounds = win.getContentBounds();
	view.setBounds({ x: 0, y: TITLEBAR_HEIGHT, width: contentBounds.width, height: contentBounds.height - TITLEBAR_HEIGHT });
	view.setAutoResize({ width: true, height: true });
}

//initializes communication with preload.js in the frontend thread
function initRendererEvents(win) {
  ipcMain.handle('get-menu', (event, x,y,menuName) => {
		let menu = buildMenu({icons: {app:getIconPath(config.icon)}}, menuName);
	    menu.popup({
	    	window: win,
	    	x: x,
	    	y: TITLEBAR_HEIGHT
	    });
	});
	
	ipcMain.handle("translate", (event, key) => {
		return i18n.t(key);
	});

}

//apply protections against capturing content of the application
function initContentProtection(win, view, machineId) {
  view.webContents.on('before-input-event', (event, input) => {
    if (input.control && (input.key.toLowerCase() === 'c' || input.key.toLowerCase() === 'x')) {
      console.log('Tried to copy or paste')
      event.preventDefault()
    }
  })
  
  win.setContentProtection(true)
  
  view.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    const requestHeaders = {...details.requestHeaders, ...{
        ['X-goobi-content-protection']: machineId
    }};
    callback({cancel: false, requestHeaders})
  });
}

//initialize listeners to events with the browser
function initWebListeners(win) {

  const pdfFilter = {
	  urls:["*://*/*.pdf"]
  }

  let loading = false;
  
  let startRequestObservable = rxjs.Observable.create( observer => win.webContents.session.webRequest.onBeforeRequest( (details, callback) => {
  		if(!loading && isHtml(details)) {
  			observer.next(details);
  			loading = true;
  		}
  		callback({cancel: false});
  	})
  );
  let completeRequestObservable = rxjs.Observable.create( observer => win.webContents.session.webRequest.onCompleted( (details) => {
  		if(loading && isHtml(details)) {
	  		observer.next(details);
	  		loading = false;
  		}
  	})
  );
  
    let pdfHeaderReceivedObservable = rxjs.Observable.create( observer => win.webContents.session.webRequest.onHeadersReceived( pdfFilter, (details, callback) => {
			observer.next({details: details, callback: callback});
	 })
   );


   pdfHeaderReceivedObservable
   .subscribe( ({details, callback}) => {
//	   console.log("pdf request", details);
    	details.responseHeaders["Content-Disposition"] = details.responseHeaders["Content-Disposition"][0].replace("attachment", "inline");
//    	console.log("modified pdf request", details);
    	callback(details);
   });
  
  startRequestObservable
  .subscribe( details => {
		win.webContents.send('update-loader', 'show');
  });
  
  completeRequestObservable
  .subscribe( details => {
		win.webContents.send('update-loader', 'hide');
		setLanguageFromResponse(details, win);
  });

}

//set the application language based on the response headers of a html response
function setLanguageFromResponse(details, win) {
	if(details.responseHeaders) {
  		let lang = details.responseHeaders['Content-Language'];
  		if(lang) {
  			i18n.changeLanguage(lang);
  			win.webContents.send('change-language');
  		}
  	}
}

//test if the html response or request has html content
function isHtml(details) {
	if(details.resourceType) {
		return details.resourceType.match(/main_?frame/i);
	} else if(details.responseHeaders) {
		return details.responseHeaders['Content-Type']?.match(/text\/html/)
	} else if(details.requestHeaders) {
		return details.requestHeaders['Accept']?.match(/text\/html/);
	} else {
		return false;
	}
}

function getIconPath(icon) {
	return path.join(__dirname, '../../assets/icons', icon)
}

