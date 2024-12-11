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
Configuration file for basic application settings
**/
module.exports = {
  /**
  The title of the application to be displayed in the title bar
  **/
  title: "app_title",
  /**
  The URL of the web page to navigate to at startup. Generally the base URL of a Goobi viewer 
  **/
  viewerUrl: "https://digital.zlb.de/viewer/index/",
  /**
  URL to open when loading an epub-document. The term '{epubUrl}' is replaced by the actual url of the epub document that was attempted to load
  **/
  epubViewUrl: "https://digital.zlb.de/viewer/epub/?url={epubUrl}",
  /**
  The languages available for menu options. 
  Each language requires a file locales/{language}/translation.json with the required translations to work
  **/
  languages: ["de", "en"],
  /**
  The language to use if the set viewer language doesn't match any language set in languages
  **/
  fallbackLng: "de",
  /**
  The image within the assets/icons folder to use as the application icon
  **/
  icon: "app_256.png",
  /**
   * If set to true, a menu option is added which prints the browser content
   */
  allowPrint: false
};
