// ==UserScript==
// @name         D12 turn checker for slack
// @namespace    https://hubot-gregcochard.rhcloud.com/hubot
// @updateURL    https://gist.githubusercontent.com/gcochard/1b6e94b6ae6e2f60a6d8/raw/d12.user.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.0.0/lodash.min.js
// @require      https://npmcdn.com/dive-buddy
// @version      1.6.24
// @description  calls hubot with the current player and other features
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
/*global $: false, playGame: true, _: false*/
/*eslint-env browser*/
/*eslint no-console: 0*/
console.log('injected!');

var users = {
      gcochard: 'greg'
    , greg: 'gcochard'
    , kwren: 'kwren'
    , ryanbmilbourne: 'ryan'
    , ryan: 'ryanbmilbourne'
    , jobratt: 'jobratt'
    , mmacfreier: 'mmacfreier'
    , justinb: 'justin'
    , justin: 'justinb'
    , loneWolf55: 'channel'
    , suntan: 'tanleach1001'
    , tanleach1001: 'suntan'
    , johnsgill3: 'johnsgill3'
    , terryjbates: 'terryjbates'
  }
  , colorMap = {
      green: 1
    , 1: 'green'
    , blue: 2
    , 2: 'blue'
    , red: 3
    , 3: 'red'
    , pink: 4
    , 4: 'pink'
    , purple: 5
    , 5: 'purple'
    , orange: 6
    , 6: 'orange'
    , black: 7
    , 7: 'black'
    , yellow: 8
    , 8: 'yellow'
    , cyan: 9
    , 9: 'cyan'
    , fog: 'fog'
    , neutral: 0
    , 0: 'neutral'
  }
  , players = []
  , playerColors = {
      fog: 'fog'
    , neutral: 'neutral'
  }
  , playerPollInterval
  , treatyPollInterval
  , hubotLocation = 'https://hubot-gregcochard.rhcloud.com/hubot/';

$(document).ready(function(){
    'use strict';
    getPlayer();
    function colorDice(roll){
        var colors = ['green','yellow','red'], idx = 0;
        if(+roll.attack[0]<=+roll.defend[0]){
            idx++;
        }
        if(roll.attack.length === 1 || roll.defend.length === 1){
            return colors[idx?idx+1:0];
        }
        if(+roll.attack[1]<=+roll.defend[1]){
            idx++;
        }
        return colors[idx];
    }

    var me = '';
    function detectMe(){
        me = diveBuddy(playGame,'me.username','');

        if(!me){
            me = $('.nav-list.pull-left a:first').text();
        }
        console.log('me: %s',me);
        return me;
    }

    function signalToHubot(player,ended){
        'use strict';
        if(player instanceof Array){
            var valid = true;
            player = player.map(function(p){
                if(!users[p]){
                    valid = false;
                }
                return users[p];
            });
            if(!valid){
                return;
            }
            if(player.length === 1){
                // for a single one, just make it a string
                player = player[0];
            }
        } else {
            player = users[player];
        }
        if(!player){
            return;
        }

        $.ajax({
            url: hubotLocation+'pushturn',
            method: 'GET',
            success: function(){
                console.log(arguments);
            },
            failure: function(){
                console.error(arguments);
            },
            data: {
                user: player,
                from: detectMe(),
                ended: ended
            }
        });
    }

    function signalJoinToHubot(player){
        'use strict';
        if(!player){
            return;
        }

        $.ajax({
            url: hubotLocation+'pushjoin',
            method: 'POST',
            success: function(){
                console.log(arguments);
            },
            failure: function(){
                console.error(arguments);
            },
            data: {
                user: player
            }
        });
    }

    function signalStartToHubot(starter){
        'use strict';
        starter = users[starter];
        if(!starter){
            return;
        }
        $.ajax({
            url: hubotLocation+'pushstart',
            method: 'POST',
            success: function(){
                console.log(arguments);
            },
            failure: function(){
                console.error(arguments);
            },
            data: {
                user: starter,
                from: detectMe()
            }
        });
    }

    function reportDeaths(deaths){
        $.ajax({
            url: hubotLocation+'pushdeath',
            method: 'POST',
            success: function(){
                console.log(arguments);
            },
            failure: function(){
                console.error(arguments);
            },
            data: {
                deaths: deaths
            }
        });
    }

    function fetchTreaties(cb){
        'use strict';
        var called = false;
        $.ajax({
            url: hubotLocation+'treaties',
            method: 'GET',
            success: function(data){
                if(called){ return; }
                called = true;
                cb(null, data);
            },
            failure: function(e){
                if(called) { return; }
                called = true;
                cb(e);
            }
        });
    }

    function showTreatyError(err){
        'use strict';
        console.log(err);

        var treatyErr = err.statusText;
        $treaties.html($('li').attr('id','treaty-error').html(treatyErr));
    }

    // inject our treaty container
    var $treaties = $('#notifications').clone().attr({id:'treaties',class:'treaties notifications'}).html('');
    $('#notifications').parent().append($treaties);
    $('ul.nav-list.pull-left').append('<li id="toggle-treaties">Toggle Treaties</li>');
    $('#toggle-treaties').on('click',function(){
        $treaties.toggle();
        window.localStorage.setItem('treaty-state', treatyState === 'hidden'?'shown':'hidden');
    });
    var treatyState = window.localStorage.getItem('treaty-state');
    if(treatyState === 'hidden'){
        $treaties.toggle();
    }

    function showTreaties(data){
        'use strict';
        //console.log(data);
        var newTreatyIds = [];
        var oldTreatyIds = $('#treaties').find('li').map(function(i,t){
            return $(t).attr('id');
        });
        Object.keys(data).forEach(function(id){
            var t = data[id];
            var partnersWithColors = t.partners.map(function(p){
                var text = '<b style="color:'+playerColors[users[p.toLowerCase()]]+';">'+p+'</b>';
                return text;
            });
            newTreatyIds.push('treaty-'+t.id);
            // build out the treaty html
            var treatyHtml = (t.partners.length === 1 ? '<i>PENDING:</i> ':'') + 'Treaty ' + t.id + ': ' +t.terms + '<hr>' + partnersWithColors.join(', ');
            // if it doesn't exist, append it, otherwise update it
            if(!$treaties.find('#treaty-'+t.id).length){
                $treaties.append($(document.createElement('li')).attr({tag: 'li', class: 'treaty', id: 'treaty-'+ t.id}).html(treatyHtml));
            } else {
                $('#treaty-'+t.id).html(treatyHtml);
            }
        });
        var expiredTreaties = _.difference(oldTreatyIds,newTreatyIds);
        expiredTreaties.forEach(function(id){
            var $el = $('#'+id);
            $el.fadeOut(function(){
                $el.remove();
            });
        });
        return;
    }

    var reqs = 0, pollErrors = 0;
    function pollTreaties(){
        'use strict';
        // only want one outstanding request
        if(reqs){ return; }
        reqs++;
        fetchTreaties(function(err,data){
            reqs--;
            if(err){
                // do some exponential backoff
                if(++treatyErrors > 5){
                    treatyErrors = 0;
                    console.log(err);
                    return showTreatyError(err);
                }
                return setTimeout(pollTreaties,100*(2<<treatyErrors));
            }
            return showTreaties(data);
        });
    }

    function storeDice(p, a, ac, d, dc){
        var game = window.location.pathname.split('/').pop();
        var ls = window.localStorage.getItem('diceStore');
        var entry = {p: p, a: a, ac: ac, d: d, dc: dc, t: Date.now()};
        if(ls){
            ls = JSON.parse(ls);
            if(!ls[game]){
                ls[game] = [];
            }
        } else {
            ls = {};
            ls[game] = [];
        }
        ls[game].push(entry);
        window.localStorage.setItem('diceStore',JSON.stringify(ls));
    }

    function storeUpdate(u){
        var game = window.location.pathname.split('/').pop();
        var ls = window.localStorage.getItem('updateStore');
        var entry = {u: u, t: Date.now()};
        if(ls){
            ls = JSON.parse(ls);
            if(!ls[game]){
                ls[game] = [];
            }
        } else {
            ls = {};
            ls[game] = [];
        }
        ls[game].push(entry);
        window.localStorage.setItem('updateStore',JSON.stringify(ls));
    }

    function fetchLocalDice(){
        var game = window.location.pathname.split('/').pop();
        var ls = window.localStorage.getItem('diceStore');
        return diveBuddy(JSON.parse(ls),game,null);
    }

    function queueDice(p, a, d){
        var queue = window.localStorage.getItem('diceQueue');
        if(queue){
            queue = JSON.parse(queue);
        } else {
            queue = [];
        }
        var q = {p:'',a:0,d:0};
        q.p = p;
        q.a += a;
        q.d += d;
        queue.push(q);
        window.localStorage.setItem('diceQueue',JSON.stringify(q));
    }

    function getQueue(){
        var queue = window.localStorage.getItem('diceQueue');
        if(queue){
            queue = JSON.parse(queue);
            var q = queue.shift();
            if(!queue.length){
                window.localStorage.clear();
            } else {
                window.localStorage.setItem('diceQueue',JSON.stringify(queue));
            }
            return q;
        }
        return null;
    }

    function sendDiceToHubot(player, attack, defend){
        $.ajax({
            url: hubotLocation+'pushdice',
            method: 'POST',
            success: function(){
                var q = getQueue();
                if(q){
                    sendDiceToHubot(q.p,q.a,q.d);
                }
            },
            failure: function(){
                queueDice(player, attack, defend);
            },
            data: {
                player: player,
                attack: attack,
                defend: defend
            }
        });
    }

    // inject our dice container
    var $diceContainer = $('<div></div>').attr({
        id:'dice-container',
        class:'dice',
        style:'height:330px;left:0px;position:fixed;'
    });
    $('#notifications').parent().append($diceContainer);
    var $dice = $('#notifications').clone().attr({
        id:'dice',
        class:'dice notifications',
        style:'overflow:scroll;height:300px;width:250px;top:0px;'
    }).html('');
    $diceContainer.append($dice);

    var $dicestats = $('#notifications').clone().attr({
        id: 'dicestatslink',
        class: 'dice notifications',
        style: 'position:relative;top:300px;'
    }).html('');
    var game = window.location.pathname.split('/').pop();
    $dicestats.html('<a target="_blank" href="http://github.gregcochard.com/dice-viz/dice-viz.html?'+game+'">Dice Stats</a>');
    $diceContainer.append($dicestats);

    $('ul.nav-list.pull-left').append('<li id="toggle-dice">Toggle Dice</li>');

    $('#toggle-dice').on('click',function(){
        $diceContainer.toggle();
        window.localStorage.setItem('dice-state', diceState === 'hidden'?'shown':'hidden');
    });
    var diceState = window.localStorage.getItem('dice-state');
    if(diceState === 'hidden'){
        $diceContainer.toggle();
    }

    var fog = $('.game-settings:last strong:nth(2)').text().toLowerCase() === 'yes';

    var $hudContainer = $('<div></div>').attr({
        id:'hud-container',
        class:'hud',
        style:'height:400px;top:350px;left:0px;position:fixed;'
    });
    var $hud = $('#dice').clone().attr({
        id:'hud',
        class:'hud',
        style:'overflow:scroll;height:300px;width:250px;top:0px;left:0px;position:relative;'
    }).html('');
    $hud.html([
    '<li><span>Territories: </span><ul class="notifications" style="position:relative;height:100%;top:-10px;" id="colors"></ul></li>',
    '<li><span>Troops: </span><ul class="notifications" style="position:relative;height:100%;top:-10px;" id="counts"></ul></li>'
    ].join(''));
    $hudContainer.append($hud);
    var $summary = $dicestats.clone().attr({
        id: 'game-summary',
        style: 'position:relative;'
    }).html('<a target="_blank" href="http://github.gregcochard.com/dice-viz/summary-viz.html?'+game+'">Game Summary</a>');
    $hudContainer.append($summary);
    var $replay = $summary.clone().attr({
        id: 'game-replay',
        style: 'position:relative;'
    }).html('<a target="_blank" href="http://github.gregcochard.com/dice-viz/replay-viz.html?'+game+'">Game Replay</a>');
    $hudContainer.append($replay);
    $('#notifications').parent().append($hudContainer);

    $('ul.nav-list.pull-left').append('<li id="toggle-hud">Toggle HUD</li>');
    $('#toggle-hud').on('click',function(){
        $hudContainer.toggle();
        window.localStorage.setItem('hud-state', diceState === 'hidden'?'shown':'hidden');
    });
    var hudState = window.localStorage.getItem('hud-state');
    if(hudState === 'hidden'){
        $hudContainer.toggle();
    }

    /*
    var $larger = $('#map-larger').clone().attr({
        id: 'map-even-larger'
    });
    $larger.find('a').text('Largest');
    $('#map-larger').parent().prepend($larger);

    $larger.find('a').removeAttr('onclick');
    $larger.find('a').click(function(){
        // set the size of both the map and the territories to double
        $('#map').css({
            'background-size': '100%',
            width: '1024px',
            height: '768px'
        });
        $('.territory-large').css();
    });
    */

    function numPlayers(){
        return $('#players-tab table tr').length;
    }

    function getStarter(){
        return $('#players-tab table tr > .name > a').text();
    }

    if(numPlayers() === 1){
        signalStartToHubot(getStarter());
    }

    detectMe();
    var currDice = [];

    function populateDiceGui(dice){
        fog = $('.game-settings:last strong:nth(2)').text().toLowerCase() === 'yes';
        detectMe();
        var oldCount = $('#dice li').length, newCount = 0;
        if(!(dice instanceof Array)){
            console.log('no dice for this game yet :(');
            return;
        }
        currDice = dice;
        var dicehtml = dice.map(function(roll){
            if(roll.player !== me && fog){
                return;
            }
            var color = colorDice(roll);
            return '<li style="color: '+color+'">'+roll.player+': attack('+roll.attack.join(', ')+') defend('+roll.defend.join(', ')+')</li>';
        }).filter(function(r){
            return !!r;
        });
        newCount = dicehtml.length;
        dicehtml = dicehtml.join('');
        if(oldCount !== newCount){
            $dice.html(dicehtml);
            $dice.scrollTop($dice.prop('scrollHeight'));
        }
    }

    function updateDiceGui(roll){
        currDice.push(roll);
        populateDiceGui(currDice);
    }

    (function setupDiceStream(){
      var source = new EventSource(hubotLocation + 'dicestream');
      source.addEventListener('handshake', function(e) {
          console.log(e);
      }, false);

      source.addEventListener('dice', function(e) {
          var roll = {};
          try{
              roll = JSON.parse(e.data);
              if(roll instanceof Array){
                  // call for each of the items in the array
                  roll.forEach(updateDiceGui);
              } else {
                  updateDiceGui(roll);
              }
          } catch(er){
              console.error(er);
          }

      }, false);

    }());

    function signalChangeToHubot(change,player){
        'use strict';
        if(!player){
            return;
        }

        $.ajax({
            url: hubotLocation+'push'+change,
            method: 'POST',
            success: function(){
                console.log(arguments);
            },
            failure: function(){
                console.error(arguments);
            },
            data: {
                user: player
            }
        });
    }

    var signalTurnStartToHubot = signalChangeToHubot.bind(null,'startturn');
    var signalTurnEndToHubot = signalChangeToHubot.bind(null,'endturn');

    var oldBeginTurn = playGame.beginTurn;
    playGame.beginTurn = function(){
        me = detectMe();
        signalTurnStartToHubot(me);
        return oldBeginTurn.call(playGame);
    };

    var oldEndTurn = playGame.endTurn;
    playGame.endTurn = function(){
        me = detectMe();
        signalTurnEndToHubot(me);
        return oldEndTurn.call(playGame);
    };

    var oldInitializeTurn = playGame.initializeTurn;
    playGame.initializeTurn = function(){
        if(this.myTurn.step == 2 && this.gameState.players[this.me.player_id].pending_reinforcements == 0){
            return window.location.reload();
        }
        return oldInitializeTurn.call(playGame);
    };

    var oldShowDice = playGame.showDice;
    playGame.showDice = function(att,att_color,def,def_color){
        sendDiceToHubot(getPlayer(),att,def);
        //storeDice(getPlayer(),att,att_color,def,def_color);
        return oldShowDice.call(this,att,att_color,def,def_color);
    };

    $('.join-game-submit').on('click',function jointrigger(){
    $('.join-game-submit').off('click',jointrigger);
        me = detectMe();
        if(!me){
            return setTimeout(jointrigger,100);
        }
        return signalJoinToHubot(me);
    });

    var oldRunUpdates = playGame.runUpdates;
    playGame.runUpdates = function(result){
        //storeUpdate(result);
        if(result.winner){
            signalToHubot(result.winner.names, true);
            clearInterval(playerPollInterval);
            clearInterval(treatyPollInterval);
        }
        var colors = {};
        var counts = {};
        function eachColor(idx,el){
            el = $(el);
            var color = el.attr('class').replace(/.*tc-(fog|[\d]).*/,'$1');
            color = colorMap[color];
            colors[color] = colors[color] || 0;
            colors[color]++;
            var count = el.find('a').text()|0;
            counts[color] = counts[color] || 0;
            counts[color] += count;
        }
        if($('div.tt-color').length){
            $('div.tt-color').each(eachColor);
        } else if($('div.territory-large').length){
            $('div.territory-large').each(eachColor);
        } else if($('div.territory-small').length){
            $('div.territory-small').each(eachColor);
        }
        function mapCount(count,color){
            return '<li>' + playerColors[color] + ': ' + count + '</li>';
        }
        $('#hud #colors').html(_.map(colors,mapCount));
        $('#hud #counts').html(_.map(counts,mapCount));
        return oldRunUpdates.call(this,result);
    };
    var currDead = [];
    var oldUpdatePlayers = playGame.updatePlayerlist;
    playGame.updatePlayerlist = function(players){
        var newDead = [];
        // clone the object
        Object.keys(players).forEach(function(p){ newDead.push(players[p]); });
        // filter out alives
        newDead = newDead.filter(function(p){ return !p.alive; });
        // now translate to slack usernames
        newDead = newDead.map(function(p){ return users[p.username]; });
        if(currDead.length !== newDead.length){
            // save it...
            currDead = newDead;
            // report the deaths...
            reportDeaths(currDead);
        }
        // ...and finally call the original method
        return oldUpdatePlayers.call(this,players);
    };

    var curPlayer;

    function getPlayer(){
        players = $('tr > .name > a');
        players = players.map(function(idx,v){
            var $v = $(v);
            // set the color of the player
            var color = $v.parent().parent().children(':last').find('img').attr('src').split('/').pop().split('.')[0];
            color = colorMap[color];
            playerColors[$v.text()] = color.toLowerCase();
            playerColors[color.toLowerCase()] = $v.text()
            return $v.html();
        });
        if(!players.length){
            return;
        }
        var newPlayer = $('td.turn').parent().find('.name > a');
        if(!newPlayer){
            return;
        }
        newPlayer = newPlayer.html();
        return newPlayer;
    }

    function detectWinner(){
        var winners = $('td.status.winner').parent().find(':nth(3)').map(function(i,w){
            return $(w).text();
        }).toArray();
        return winners.length?winners:null;
    }

    var oldShowNotification = playGame.showNotificationBanner;
    playGame.showNotificationBanner = function(color, message){
        // defer polling until after the notification banner is shown
        setTimeout(pollPlayer,20);
        return oldShowNotification.apply(this,Array.prototype.slice.call(arguments));
    };

    function pollPlayer(){
        var newPlayer = getPlayer();
        if(!curPlayer){
            curPlayer = newPlayer;
            if(!newPlayer){
                var winner = detectWinner();
                if(winner){
                    return signalToHubot(winner,true);
                } else {
                    // something is stale with d12
                    return;
                }
            }
            signalToHubot(curPlayer);
        }
        if(curPlayer && newPlayer && curPlayer !== newPlayer){
            curPlayer = newPlayer;
            signalToHubot(curPlayer);
        }
    }
    // fallback to polling at 60s interval if change detection doesn't work
    playerPollInterval = setInterval(pollPlayer,60000);

    setTimeout(pollTreaties,2000);
    // poll treaties at a 15 second interval
    treatyPollInterval = setInterval(pollTreaties,15000);
});
