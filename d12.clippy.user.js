// ==UserScript==
// @name         D12 turn checker for slack injector+
// @namespace    https://hubot-gregcochard.rhcloud.com/hubot
// @updateURL    https://github.gregcochard.com/userscripts/d12.clippy.user.js
// @require      https://npmcdn.com/async
// @version      1.0.1
// @description  injects the real script so we can debug with firebug
// @author       Greg Cochard
// @match        http://dominating12.com/game/*
// @match        http://www.dominating12.com/game/*
// @match        https://dominating12.com/game/*
// @match        https://www.dominating12.com/game/*
// @match        http://dominating12.com/index.php/game/*
// @match        http://www.dominating12.com/index.php/game/*
// @match        https://dominating12.com/index.php/game/*
// @match        https://www.dominating12.com/index.php/game/*
// @grant        none
// ==/UserScript==
/*eslint-env browser*/

var sources = [
  'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.0.0/lodash.min.js',
  'https://npmcdn.com/dive-buddy',
  'https://github.gregcochard.com/userscripts/d12.user.js',
  'https://github.gregcochard.com/userscripts/clippy.min.js',
  'https://github.gregcochard.com/userscripts/clippy.js'
];
function injectTag(tag, done){
    var e = document.createElement(tag.name);
    Object.keys(tag).forEach(function(attr){
        if(attr === 'name'){
            return;
        }
        e[attr] = tag[attr];
    });
    e.onload = function(){
        if(done){
            done();
        }
    };
    document.getElementsByTagName('head')[0].appendChild(e);
}
injectTag({name:'link', rel:'stylesheet', type:'text/css', href:'https://github.gregcochard.com/userscripts/clippy.css', media:'all'});
function injectSources(src, done){
  var e = document.createElement('script');
  e.src = src;
  e.type = 'text/javascript';
  document.getElementsByTagName('head')[0].appendChild(e);
  e.onload = function(){
    done();
  };
}
async.mapSeries(sources,injectSources);
