// ==UserScript==
// @name         D12 turn checker for slack
// @namespace    https://hubot-gregcochard.rhcloud.com/hubot
// @updateURL    https://gist.githubusercontent.com/gcochard/1b6e94b6ae6e2f60a6d8/raw/d12.user.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.0.0/lodash.min.js
// @require      https://npmcdn.com/dive-buddy
// @version      1.5.2
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

//var hidden = false;
$(document).ready(function(){
    'use strict';
    function colorDice(roll){
        var colors = ['green','yellow','red'], idx = 0;
        if(roll.attack[0]<=roll.defend[0]){
            idx++;
        }
        if(roll.attack.length === 1 || roll.defend.length === 1){
            return colors[idx?idx+1:0];
        }
        if(roll.attack[1]<=roll.defend[1]){
            idx++;
        }
        return colors[idx];
    }
    
    function detectMe(){
        var me = diveBuddy(playGame,'me.username','');
    
        if(!me){
            me = $('.nav-list.pull-left a:first').text();
        }
        return me;
    }
    
    var signalToHubot = _.debounce(function chattySignalToHubot(player,ended){
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
    }, 5000);

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
    var $treaties = $('#notifications').clone().attr({id:'treaties',class:'treaties notifications'});
    $('#notifications').parent().append($treaties);
    $('ul.nav-list.pull-left').append('<li id="toggle-treaties">Toggle Treaties</li>');
    $('#toggle-treaties').on('click',function(){
        $treaties.toggle();
    });
    
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
    
    function queueDice(p, a, d){
        var q = window.localStorage.getItem('diceQueue');
        if(q){
            q = JSON.parse(q);
        } else {
            q = {p:'',a:0,d:0};
        }
        q.p = p;
        q.a += a;
        q.d += d;
        window.localStorage.setItem('diceQueue',JSON.stringify(q));
    }
    
    function getQueue(){
        var q = window.localStorage.getItem('diceQueue');
        if(q){
            q = JSON.parse(q);
            window.localStorage.clear();
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
    var $dice = $('#notifications').clone().attr({
        id:'dice',
        class:'dice notifications',
        style:'overflow:scroll;height:300px;left:0px;position:fixed;'
    });
    $('#notifications').parent().append($dice);
    $('ul.nav-list.pull-left').append('<li id="toggle-dice">Toggle Dice</li>');
    $('#toggle-dice').on('click',function(){
        $dice.toggle();
    });

    var fog = $('.game-settings:last strong:nth(2)').text().toLowerCase() === 'yes';

    var $hud = $('#dice').clone().attr({
        id:'hud',
        class:'hud notifications',
        style:'overflow:scroll;height:300px;top:400px;left:0px;position:fixed;'
    });
    $hud.html('<span>Territories: </span><ul id="colors"></ul><span>Troops: </span><ul id="counts"></ul>');
    $('#dice').parent().append($hud);
    $('ul.nav-list.pull-left').append('<li id="toggle-hud">Toggle HUD</li>');
    $('#toggle-hud').on('click',function(){
        $hud.toggle();
    });

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

    function fetchDiceFromHubot(player){
        player = player || detectMe();
        var game = window.location.pathname.split('/').pop();
        $.ajax({
            url: hubotLocation+'dice?game='+game,
            method: 'GET',
            success: function(dice){
                var oldCount = $('#dice li').length, newCount = 0;
                if(!(dice instanceof Array)){
                    console.log('no dice for this game yet :(');
                    return;
                }
                var dicehtml = dice.map(function(roll){
                    if(roll.player !== player && !fog){
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
            },
            failure: function(){
                
            }
        });
    }
    fetchDiceFromHubot();
    setInterval(fetchDiceFromHubot, 30000);

    //var oldSendAttack = playGame.sendAttack;
    playGame.sendAttack = function(){
        var ab = $('.attack-button');
        ab.attr('disabled',true).off('click').removeAttr('onclick');
        return this.ajax('attack', {
            'territory_from': this.selectedTerritory,
            'territory_to': this.targetedTerritory
        }, (function(_this) {
            return function(result) {
                ab.removeAttr('disabled').off('click').on('click',playGame.sendAttack.bind(playGame));
                if (result.success === true) {
                    _this.runUpdates(result);
                    if (_this.status !== 3) {
                        return _this.updateTurn(result.turn, _this.gameState.territories[_this.selectedTerritory].troops === 1);
                    }
                } else {
                    _this.reportError(result.error);
                    return _this.initializeTurn();
                }
            };
        })(this));
    };
    
    var oldShowDice = playGame.showDice;
    playGame.showDice = function(att,att_color,def,def_color){
        sendDiceToHubot(getPlayer(),att,def);
        return oldShowDice.call(this,att,att_color,def,def_color);
    };

    $('.join-game-submit').on('click',function jointrigger(){
    $('.join-game-submit').off('click',jointrigger);
        var me = detectMe();
        if(!me){
            return setTimeout(jointrigger,100);
        }
        return signalJoinToHubot(me);
    });

    var oldRunUpdates = playGame.runUpdates;
    playGame.runUpdates = function(result){
        if(result.winner){
            signalToHubot(result.winner.names, true);
            clearInterval(playerPollInterval);
            clearInterval(treatyPollInterval);
        }
        var colors = {};
        var counts = {};
        $('div.tt-color').each(function(idx,el){
            el = $(el);
            var color = el.attr('class').replace(/.*tc-(fog|[\d]).*/,'$1');
            color = colorMap[color];
            colors[color] = colors[color] || 0;
            colors[color]++;
            var count = el.find('a').text()|0;
            counts[color] = counts[color] || 0;
            counts[color] += count;
        });
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
            var color = $v.parent().parent().children(':last').children(':last').children(':last').text();
            // if colorblind settings off, do this instead
            if(!color){
                color = $v.parent().parent().children(':last').children(':last').attr('src').split('/').pop().split('.')[0];
                color = colorMap[color];
            }
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
        return winners;
    }
    
    var oldShowNotification = playGame.showNotificationBanner;
    playGame.showNotificationBanner = function(color, message){
        switch(message){
        case 'Turn finished.':
            pollPlayer();
            break;
        }
        return oldShowNotification.apply(this,Array.prototype.slice.call(arguments));
    };

    function pollPlayer(){
        var newPlayer = getPlayer();
        if(!curPlayer){
            curPlayer = newPlayer;
            if(!newPlayer){
                curPlayer = detectWinner();
                return signalToHubot(curPlayer,true);
            }
            signalToHubot(curPlayer);
        }
        if(curPlayer && newPlayer && curPlayer !== newPlayer){
            curPlayer = newPlayer;
            signalToHubot(curPlayer);
        }
    }
    pollPlayer();
    // fallback to polling at 30s interval if change detection doesn't work
    playerPollInterval = setInterval(pollPlayer,30000);
    
    setTimeout(pollTreaties,2000);
    // poll treaties at a 15 second interval
    treatyPollInterval = setInterval(pollTreaties,15000);
});
