var speakerViewHTML = `<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>reveal.js - Speaker View</title>\n<style>\nbody {\nfont-family: Helvetica;\nfont-size: 18px;\n}\n#current-slide,\n#upcoming-slide,\n#speaker-controls {\npadding: 6px;\nbox-sizing: border-box;\n-moz-box-sizing: border-box;\n}\n#current-slide iframe,\n#upcoming-slide iframe {\nwidth: 100%;\nheight: 100%;\nborder: 1px solid #ddd;\n}\n#current-slide .label,\n#upcoming-slide .label {\nposition: absolute;\ntop: 10px;\nleft: 10px;\nz-index: 2;\n}\n#connection-status {\nposition: absolute;\ntop: 0;\nleft: 0;\nwidth: 100%;\nheight: 100%;\nz-index: 20;\npadding: 30% 20% 20% 20%;\nfont-size: 18px;\ncolor: #222;\nbackground: #fff;\ntext-align: center;\nbox-sizing: border-box;\nline-height: 1.4;\n}\n.overlay-element {\nheight: 34px;\nline-height: 34px;\npadding: 0 10px;\ntext-shadow: none;\nbackground: rgba( 220, 220, 220, 0.8 );\ncolor: #222;\nfont-size: 14px;\n}\n.overlay-element.interactive:hover {\nbackground: rgba( 220, 220, 220, 1 );\n}\n#current-slide {\nposition: absolute;\nwidth: 60%;\nheight: 100%;\ntop: 0;\nleft: 0;\npadding-right: 0;\n}\n#upcoming-slide {\nposition: absolute;\nwidth: 40%;\nheight: 40%;\nright: 0;\ntop: 0;\n}\n/* Speaker controls */\n#speaker-controls {\nposition: absolute;\ntop: 40%;\nright: 0;\nwidth: 40%;\nheight: 60%;\noverflow: auto;\nfont-size: 18px;\n}\n.speaker-controls-time.hidden,\n.speaker-controls-notes.hidden {\ndisplay: none;\n}\n.speaker-controls-time .label,\n.speaker-controls-pace .label,\n.speaker-controls-notes .label {\ntext-transform: uppercase;\nfont-weight: normal;\nfont-size: 0.66em;\ncolor: #666;\nmargin: 0;\n}\n.speaker-controls-time, .speaker-controls-pace {\nborder-bottom: 1px solid rgba( 200, 200, 200, 0.5 );\nmargin-bottom: 10px;\npadding: 10px 16px;\npadding-bottom: 20px;\ncursor: pointer;\n}\n.speaker-controls-time .reset-button {\nopacity: 0;\nfloat: right;\ncolor: #666;\ntext-decoration: none;\n}\n.speaker-controls-time:hover .reset-button {\nopacity: 1;\n}\n.speaker-controls-time .timer,\n.speaker-controls-time .clock {\nwidth: 50%;\n}\n.speaker-controls-time .timer,\n.speaker-controls-time .clock,\n.speaker-controls-time .pacing .hours-value,\n.speaker-controls-time .pacing .minutes-value,\n.speaker-controls-time .pacing .seconds-value {\nfont-size: 1.9em;\n}\n.speaker-controls-time .timer {\nfloat: left;\n}\n.speaker-controls-time .clock {\nfloat: right;\ntext-align: right;\n}\n.speaker-controls-time span.mute {\nopacity: 0.3;\n}\n.speaker-controls-time .pacing-title {\nmargin-top: 5px;\n}\n.speaker-controls-time .pacing.ahead {\ncolor: blue;\n}\n.speaker-controls-time .pacing.on-track {\ncolor: green;\n}\n.speaker-controls-time .pacing.behind {\ncolor: red;\n}\n.speaker-controls-notes {\npadding: 10px 16px;\n}\n.speaker-controls-notes .value {\nmargin-top: 5px;\nline-height: 1.4;\nfont-size: 1.2em;\n}\n/* Layout selector\xA0*/\n#speaker-layout {\nposition: absolute;\ntop: 10px;\nright: 10px;\ncolor: #222;\nz-index: 10;\n}\n#speaker-layout select {\nposition: absolute;\nwidth: 100%;\nheight: 100%;\ntop: 0;\nleft: 0;\nborder: 0;\nbox-shadow: 0;\ncursor: pointer;\nopacity: 0;\nfont-size: 1em;\nbackground-color: transparent;\n-moz-appearance: none;\n-webkit-appearance: none;\n-webkit-tap-highlight-color: rgba(0, 0, 0, 0);\n}\n#speaker-layout select:focus {\noutline: none;\nbox-shadow: none;\n}\n.clear {\nclear: both;\n}\n/* Speaker layout: Wide */\nbody[data-speaker-layout=\"wide\"] #current-slide,\nbody[data-speaker-layout=\"wide\"] #upcoming-slide {\nwidth: 50%;\nheight: 45%;\npadding: 6px;\n}\nbody[data-speaker-layout=\"wide\"] #current-slide {\ntop: 0;\nleft: 0;\n}\nbody[data-speaker-layout=\"wide\"] #upcoming-slide {\ntop: 0;\nleft: 50%;\n}\nbody[data-speaker-layout=\"wide\"] #speaker-controls {\ntop: 45%;\nleft: 0;\nwidth: 100%;\nheight: 50%;\nfont-size: 1.25em;\n}\n/* Speaker layout: Tall */\nbody[data-speaker-layout=\"tall\"] #current-slide,\nbody[data-speaker-layout=\"tall\"] #upcoming-slide {\nwidth: 45%;\nheight: 50%;\npadding: 6px;\n}\nbody[data-speaker-layout=\"tall\"] #current-slide {\ntop: 0;\nleft: 0;\n}\nbody[data-speaker-layout=\"tall\"] #upcoming-slide {\ntop: 50%;\nleft: 0;\n}\nbody[data-speaker-layout=\"tall\"] #speaker-controls {\npadding-top: 40px;\ntop: 0;\nleft: 45%;\nwidth: 55%;\nheight: 100%;\nfont-size: 1.25em;\n}\n/* Speaker layout: Notes only */\nbody[data-speaker-layout=\"notes-only\"] #current-slide,\nbody[data-speaker-layout=\"notes-only\"] #upcoming-slide {\ndisplay: none;\n}\nbody[data-speaker-layout=\"notes-only\"] #speaker-controls {\npadding-top: 40px;\ntop: 0;\nleft: 0;\nwidth: 100%;\nheight: 100%;\nfont-size: 1.25em;\n}.speaker-controls-notes .lyrics {display: flex;white-space: pre-wrap;}.speaker-controls-notes .lyrics span {flex: 1 1 80%;}.speaker-controls-notes .lyrics .chord {flex: 1 1 20%;font-weight: bold;}@media screen and (max-width: 1080px) {\nbody[data-speaker-layout=\"default\"] #speaker-controls {\nfont-size: 16px;\n}\n}\n@media screen and (max-width: 900px) {\nbody[data-speaker-layout=\"default\"] #speaker-controls {\nfont-size: 14px;\n}\n}\n@media screen and (max-width: 800px) {\nbody[data-speaker-layout=\"default\"] #speaker-controls {\nfont-size: 12px;\n}\n}\n</style>\n</head>\n<body>\n<div id=\"connection-status\">Loading speaker view...</div>\n<div id=\"current-slide\"></div>\n<div id=\"upcoming-slide\"><span class=\"overlay-element label\">Upcoming</span></div>\n<div id=\"speaker-controls\">\n<div class=\"speaker-controls-time\">\n<h4 class=\"label\">Time <span class=\"reset-button\">Click to Reset</span></h4>\n<div class=\"clock\">\n<span class=\"clock-value\">0:00 AM</span>\n</div>\n<div class=\"timer\">\n<span class=\"hours-value\">00</span><span class=\"minutes-value\">:00</span><span class=\"seconds-value\">:00</span>\n</div>\n<div class=\"clear\"></div>\n<h4 class=\"label pacing-title\" style=\"display: none\">Pacing \u2013 Time to finish current slide</h4>\n<div class=\"pacing\" style=\"display: none\">\n<span class=\"hours-value\">00</span><span class=\"minutes-value\">:00</span><span class=\"seconds-value\">:00</span>\n</div>\n</div>\n<div class=\"speaker-controls-notes hidden\">\n<h4 class=\"label\">Notes</h4>\n<div class=\"value\"></div>\n</div>\n</div>\n<div id=\"speaker-layout\" class=\"overlay-element interactive\">\n<span class=\"speaker-layout-label\"></span>\n<select class=\"speaker-layout-dropdown\"></select>\n</div>\n<script>\n(function() {\nvar notes,\nnotesValue,\ncurrentState,\ncurrentSlide,\nupcomingSlide,\nlayoutLabel,\nlayoutDropdown,\npendingCalls = {},\nlastRevealApiCallId = 0,\nconnected = false;\nvar SPEAKER_LAYOUTS = {\n'default': 'Default',\n'wide': 'Wide',\n'tall': 'Tall',\n'notes-only': 'Notes only'\n};\nsetupLayout();\nvar connectionStatus = document.querySelector( '#connection-status' );\nvar connectionTimeout = setTimeout( function() {\nconnectionStatus.innerHTML = 'Error connecting to main window.<br>Please try closing and reopening the speaker view.';\n}, 5000 );\nwindow.addEventListener( 'message', function( event ) {\nclearTimeout( connectionTimeout );\nconnectionStatus.style.display = 'none';\nvar data = JSON.parse( event.data );\n// The overview mode is only useful to the reveal.js instance\n// where navigation occurs so we don't sync it\nif( data.state ) delete data.state.overview;\n// Messages sent by the notes plugin inside of the main window\nif( data && data.namespace === 'reveal-notes' ) {\nif( data.type === 'connect' ) {\nhandleConnectMessage( data );\n}\nelse if( data.type === 'state' ) {\nhandleStateMessage( data );\n}\nelse if( data.type === 'return' ) {\npendingCalls[data.callId](data.result);\ndelete pendingCalls[data.callId];\n}\n}\n// Messages sent by the reveal.js inside of the current slide preview\nelse if( data && data.namespace === 'reveal' ) {\nif( /ready/.test( data.eventName ) ) {\n// Send a message back to notify that the handshake is complete\nwindow.opener.postMessage( JSON.stringify({ namespace: 'reveal-notes', type: 'connected'} ), '*' );\n}\nelse if( /slidechanged|fragmentshown|fragmenthidden|paused|resumed/.test( data.eventName ) && currentState !== JSON.stringify( data.state ) ) {\nwindow.opener.postMessage( JSON.stringify({ method: 'setState', args: [ data.state ]} ), '*' );\n}\n}else if( data && data.namespace === 'reveal-menu' )\n{\nif(data.isSpeakerNotes){\nwindow.opener.postMessage( event.data, '*' );\n}else{\ncurrentSlide.contentWindow.postMessage(event.data, '*' );\n}\nupcomingSlide.contentWindow.postMessage( event.data, '*' );\n}\n} );\n/**\n * Asynchronously calls the Reveal.js API of the main frame.\n */\nfunction callRevealApi( methodName, methodArguments, callback ) {\nvar callId = ++lastRevealApiCallId;\npendingCalls[callId] = callback;\nwindow.opener.postMessage( JSON.stringify( {\nnamespace: 'reveal-notes',\ntype: 'call',\ncallId: callId,\nmethodName: methodName,\narguments: methodArguments\n} ), '*' );\n}\n/**\n * Called when the main window is trying to establish a\n * connection.\n */\nfunction handleConnectMessage( data ) {\nif( connected === false ) {\nconnected = true;\nsetupIframes( data );\nsetupKeyboard();\nsetupNotes();\nsetupTimer();\n}\n}\n/**\n * Called when the main window sends an updated state.\n */\nfunction handleStateMessage( data ) {\n// Store the most recently set state to avoid circular loops\n// applying the same state\ncurrentState = JSON.stringify( data.state );\n// No need for updating the notes in case of fragment changes\nif ( data.notes ) {\nnotes.classList.remove( 'hidden' );\nnotesValue.style.whiteSpace = data.whitespace;\nif( data.markdown ) {\nnotesValue.innerHTML = marked( data.notes );\n}\nelse {\nnotesValue.innerHTML = data.notes;\n}\n}\nelse {\nnotes.classList.add( 'hidden' );\n}\n// Update the note slides\ncurrentSlide.contentWindow.postMessage( JSON.stringify({ method: 'setState', args: [ data.state ] }), '*' );\nupcomingSlide.contentWindow.postMessage( JSON.stringify({ method: 'setState', args: [ data.state ] }), '*' );\nupcomingSlide.contentWindow.postMessage( JSON.stringify({ method: 'next' }), '*' );\n}\n// Limit to max one state update per X ms\nhandleStateMessage = debounce( handleStateMessage, 200 );\n/**\n * Forward keyboard events to the current slide window.\n * This enables keyboard events to work even if focus\n * isn't set on the current slide iframe.\n *\n * Block F5 default handling, it reloads and disconnects\n * the speaker notes window.\n */\nfunction setupKeyboard() {\ndocument.addEventListener( 'keydown', function( event ) {\nif( event.keyCode === 116 || ( event.metaKey && event.keyCode === 82 ) ) {\nevent.preventDefault();\nreturn false;\n}\ncurrentSlide.contentWindow.postMessage( JSON.stringify({ method: 'triggerKey', args: [ event.keyCode ] }), '*' );\n} );\n}\n/**\n * Creates the preview iframes.\n */\nfunction setupIframes( data ) {\nvar params = [\n'receiver',\n'progress=false',\n'history=false',\n'transition=none',\n'autoSlide=0',\n'backgroundTransition=none'\n].join( '&' );\nvar urlSeparator = /\\?/.test(data.url) ? '&' : '?';\nvar hash = '#/' + data.state.indexh + '/' + data.state.indexv;\nvar currentURL = data.url + urlSeparator + params + '&postMessageEvents=true' + hash;\nvar upcomingURL = data.url + urlSeparator + params + '&controls=false' + hash;\ncurrentSlide = document.createElement( 'iframe' );\ncurrentSlide.setAttribute( 'width', 1280 );\ncurrentSlide.setAttribute( 'height', 1024 );\ncurrentSlide.setAttribute( 'src', currentURL );\ndocument.querySelector( '#current-slide' ).appendChild( currentSlide );\nupcomingSlide = document.createElement( 'iframe' );\nupcomingSlide.setAttribute( 'width', 640 );\nupcomingSlide.setAttribute( 'height', 512 );\nupcomingSlide.setAttribute( 'src', upcomingURL );\ndocument.querySelector( '#upcoming-slide' ).appendChild( upcomingSlide );\n}\n/**\n * Setup the notes UI.\n */\nfunction setupNotes() {\nnotes = document.querySelector( '.speaker-controls-notes' );\nnotesValue = document.querySelector( '.speaker-controls-notes .value' );\n}\nfunction getTimings( callback ) {\ncallRevealApi( 'getSlidesAttributes', [], function ( slideAttributes ) {\ncallRevealApi( 'getConfig', [], function ( config ) {\nvar totalTime = config.totalTime;\nvar minTimePerSlide = config.minimumTimePerSlide || 0;\nvar defaultTiming = config.defaultTiming;\nif ((defaultTiming == null) && (totalTime == null)) {\ncallback(null);\nreturn;\n}\n// Setting totalTime overrides defaultTiming\nif (totalTime) {\ndefaultTiming = 0;\n}\nvar timings = [];\nfor ( var i in slideAttributes ) {\nvar slide = slideAttributes[ i ];\nvar timing = defaultTiming;\nif( slide.hasOwnProperty( 'data-timing' )) {\nvar t = slide[ 'data-timing' ];\ntiming = parseInt(t);\nif( isNaN(timing) ) {\nconsole.warn(\"Could not parse timing '\" + t + \"' of slide \" + i + \"; using default of \" + defaultTiming);\ntiming = defaultTiming;\n}\n}\ntimings.push(timing);\n}\nif ( totalTime ) {\n// After we've allocated time to individual slides, we summarize it and\n// subtract it from the total time\nvar remainingTime = totalTime - timings.reduce( function(a, b) { return a + b; }, 0 );\n// The remaining time is divided by the number of slides that have 0 seconds\n// allocated at the moment, giving the average time-per-slide on the remaining slides\nvar remainingSlides = (timings.filter( function(x) { return x == 0 }) ).length\nvar timePerSlide = Math.round( remainingTime / remainingSlides, 0 )\n// And now we replace every zero-value timing with that average\ntimings = timings.map( function(x) { return (x==0 ? timePerSlide : x) } );\n}\nvar slidesUnderMinimum = timings.filter( function(x) { return (x < minTimePerSlide) } ).length\nif ( slidesUnderMinimum ) {\nmessage = \"The pacing time for \" + slidesUnderMinimum + \" slide(s) is under the configured minimum of \" + minTimePerSlide + \" seconds. Check the data-timing attribute on individual slides, or consider increasing the totalTime or minimumTimePerSlide configuration options (or removing some slides).\";\nalert(message);\n}\ncallback( timings );\n} );\n} );\n}\n/**\n * Return the number of seconds allocated for presenting\n * all slides up to and including this one.\n */\nfunction getTimeAllocated( timings, callback ) {\ncallRevealApi( 'getSlidePastCount', [], function ( currentSlide ) {\nvar allocated = 0;\nfor (var i in timings.slice(0, currentSlide + 1)) {\nallocated += timings[i];\n}\ncallback( allocated );\n} );\n}\n/**\n * Create the timer and clock and start updating them\n * at an interval.\n */\nfunction setupTimer() {\nvar start = new Date(),\ntimeEl = document.querySelector( '.speaker-controls-time' ),\nclockEl = timeEl.querySelector( '.clock-value' ),\nhoursEl = timeEl.querySelector( '.hours-value' ),\nminutesEl = timeEl.querySelector( '.minutes-value' ),\nsecondsEl = timeEl.querySelector( '.seconds-value' ),\npacingTitleEl = timeEl.querySelector( '.pacing-title' ),\npacingEl = timeEl.querySelector( '.pacing' ),\npacingHoursEl = pacingEl.querySelector( '.hours-value' ),\npacingMinutesEl = pacingEl.querySelector( '.minutes-value' ),\npacingSecondsEl = pacingEl.querySelector( '.seconds-value' );\nvar timings = null;\ngetTimings( function ( _timings ) {\ntimings = _timings;\nif (_timings !== null) {\npacingTitleEl.style.removeProperty('display');\npacingEl.style.removeProperty('display');\n}\n// Update once directly\n_updateTimer();\n// Then update every second\nsetInterval( _updateTimer, 1000 );\n} );\n\nfunction _resetTimer() {\nif (timings == null) {\nstart = new Date();\n_updateTimer();\n}\nelse {\n// Reset timer to beginning of current slide\ngetTimeAllocated( timings, function ( slideEndTimingSeconds ) {\nvar slideEndTiming = slideEndTimingSeconds * 1000;\ncallRevealApi( 'getSlidePastCount', [], function ( currentSlide ) {\nvar currentSlideTiming = timings[currentSlide] * 1000;\nvar previousSlidesTiming = slideEndTiming - currentSlideTiming;\nvar now = new Date();\nstart = new Date(now.getTime() - previousSlidesTiming);\n_updateTimer();\n} );\n} );\n}\n}\ntimeEl.addEventListener( 'click', function() {\n_resetTimer();\nreturn false;\n} );\nfunction _displayTime( hrEl, minEl, secEl, time) {\nvar sign = Math.sign(time) == -1 ? \"-\" : \"\";\ntime = Math.abs(Math.round(time / 1000));\nvar seconds = time % 60;\nvar minutes = Math.floor( time / 60 ) % 60 ;\nvar hours = Math.floor( time / ( 60 * 60 )) ;\nhrEl.innerHTML = sign + zeroPadInteger( hours );\nif (hours == 0) {\nhrEl.classList.add( 'mute' );\n}\nelse {\nhrEl.classList.remove( 'mute' );\n}\nminEl.innerHTML = ':' + zeroPadInteger( minutes );\nif (hours == 0 && minutes == 0) {\nminEl.classList.add( 'mute' );\n}\nelse {\nminEl.classList.remove( 'mute' );\n}\nsecEl.innerHTML = ':' + zeroPadInteger( seconds );\n}\nfunction _updateTimer() {\nvar diff, hours, minutes, seconds,\nnow = new Date();\ndiff = now.getTime() - start.getTime();\nclockEl.innerHTML = now.toLocaleTimeString( 'en-US', { hour12: true, hour: '2-digit', minute:'2-digit' } );\n_displayTime( hoursEl, minutesEl, secondsEl, diff );\nif (timings !== null) {\n_updatePacing(diff);\n}\n}\nfunction _updatePacing(diff) {\ngetTimeAllocated( timings, function ( slideEndTimingSeconds ) {\nvar slideEndTiming = slideEndTimingSeconds * 1000;\ncallRevealApi( 'getSlidePastCount', [], function ( currentSlide ) {\nvar currentSlideTiming = timings[currentSlide] * 1000;\nvar timeLeftCurrentSlide = slideEndTiming - diff;\nif (timeLeftCurrentSlide < 0) {\npacingEl.className = 'pacing behind';\n}\nelse if (timeLeftCurrentSlide < currentSlideTiming) {\npacingEl.className = 'pacing on-track';\n}\nelse {\npacingEl.className = 'pacing ahead';\n}\n_displayTime( pacingHoursEl, pacingMinutesEl, pacingSecondsEl, timeLeftCurrentSlide );\n} );\n} );\n}\n}\n/**\n * Sets up the speaker view layout and layout selector.\n */\nfunction setupLayout() {\nlayoutDropdown = document.querySelector( '.speaker-layout-dropdown' );\nlayoutLabel = document.querySelector( '.speaker-layout-label' );\n// Render the list of available layouts\nfor( var id in SPEAKER_LAYOUTS ) {\nvar option = document.createElement( 'option' );\noption.setAttribute( 'value', id );\noption.textContent = SPEAKER_LAYOUTS[ id ];\nlayoutDropdown.appendChild( option );\n}\n// Monitor the dropdown for changes\nlayoutDropdown.addEventListener( 'change', function( event ) {\nsetLayout( layoutDropdown.value );\n}, false );\n// Restore any currently persisted layout\nsetLayout( getLayout() );\n}\n/**\n * Sets a new speaker view layout. The layout is persisted\n * in local storage.\n */\nfunction setLayout( value ) {\nvar title = SPEAKER_LAYOUTS[ value ];\nlayoutLabel.innerHTML = 'Layout' + ( title ? ( ': ' + title ) : '' );\nlayoutDropdown.value = value;\ndocument.body.setAttribute( 'data-speaker-layout', value );\n// Persist locally\nif( supportsLocalStorage() ) {\nwindow.localStorage.setItem( 'reveal-speaker-layout', value );\n}\n}\n/**\n * Returns the ID of the most recently set speaker layout\n * or our default layout if none has been set.\n */\nfunction getLayout() {\nif( supportsLocalStorage() ) {\nvar layout = window.localStorage.getItem( 'reveal-speaker-layout' );\nif( layout ) {\nreturn layout;\n}\n}\n// Default to the first record in the layouts hash\nfor( var id in SPEAKER_LAYOUTS ) {\nreturn id;\n}\n}\nfunction supportsLocalStorage() {\ntry {\nlocalStorage.setItem('test', 'test');\nlocalStorage.removeItem('test');\nreturn true;\n}\ncatch( e ) {\nreturn false;\n}\n}\nfunction zeroPadInteger( num ) {\nvar str = '00' + parseInt( num );\nreturn str.substring( str.length - 2 );\n}\n/**\n * Limits the frequency at which a function can be called.\n */\nfunction debounce( fn, ms ) {\nvar lastTime = 0,\ntimeout;\nreturn function() {\nvar args = arguments;\nvar context = this;\nclearTimeout( timeout );\nvar timeSinceLastCall = Date.now() - lastTime;\nif( timeSinceLastCall > ms ) {\nfn.apply( context, args );\nlastTime = Date.now();\n}\nelse {\ntimeout = setTimeout( function() {\nfn.apply( context, args );\nlastTime = Date.now();\n}, ms - timeSinceLastCall );\n}\n}\n}\n})();\n</script>\n</body>\n</html>`;

/**
 * Handles opening of and synchronization with the reveal.js
 * notes window.
 *
 * Handshake process:
 * 1. This window posts 'connect' to notes window
 *    - Includes URL of presentation to show
 * 2. Notes window responds with 'connected' when it is available
 * 3. This window proceeds to send the current presentation state
 *    to the notes window
 */
const Plugin = () => {
  let popup = null;
  let connectInterval;
  let deck;

  function revealMessageListener(event) {
    let data = JSON.parse(event.data);
    if (data && data.namespace === 'reveal-notes' && data.type === 'connected') {
      clearInterval(connectInterval);
      onConnected();
    }
    if (data && data.namespace === 'reveal-notes' && data.type === 'call') {
      callRevealApi(data.methodName, data.arguments, data.callId);
    }
    if (data.namespace === 'reveal-menu' && !data.isSpeakerNotes) {
      popup.postMessage(event.data, '*');
    }
  }

  /**
   * Calls the specified Reveal.js method with the provided argument
   * and then pushes the result to the notes frame.
   */
  function callRevealApi(methodName, methodArguments, callId) {
    let result = deck[methodName].apply(deck, methodArguments);
    popup.postMessage(
      JSON.stringify({
        namespace: 'reveal-notes',
        type: 'return',
        result: result,
        callId: callId,
      }),
      '*'
    );
  }

  /**
   * Called once we have established a connection to the notes
   * window.
   */
  function onConnected() {
    // Monitor events that trigger a change in state
    deck.on('slidechanged', post);
    deck.on('fragmentshown', post);
    deck.on('fragmenthidden', post);
    deck.on('overviewhidden', post);
    deck.on('overviewshown', post);
    deck.on('paused', post);
    deck.on('resumed', post);

    // Post the initial state
    post();
  }

  /**
   * Posts the current slide data to the notes window
   */
  function post(event) {
    let slideElement = deck.getCurrentSlide(),
      notesElement = slideElement.querySelector('aside.notes'),
      fragmentElement = slideElement.querySelector('.current-fragment');

    let messageData = {
      namespace: 'reveal-notes',
      type: 'state',
      notes: '',
      markdown: false,
      whitespace: 'normal',
      state: deck.getState(),
    };

    // Look for notes defined in a slide attribute
    if (slideElement.hasAttribute('data-notes')) {
      messageData.notes = slideElement.getAttribute('data-notes');
      messageData.whitespace = 'pre-wrap';
    }

    // Look for notes defined in a fragment
    if (fragmentElement) {
      let fragmentNotes = fragmentElement.querySelector('aside.notes');
      if (fragmentNotes) {
        notesElement = fragmentNotes;
      } else if (fragmentElement.hasAttribute('data-notes')) {
        messageData.notes = fragmentElement.getAttribute('data-notes');
        messageData.whitespace = 'pre-wrap';

        // In case there are slide notes
        notesElement = null;
      }
    }

    // Look for notes defined in an aside element
    if (notesElement) {
      messageData.notes = notesElement.innerHTML;
      messageData.markdown = typeof notesElement.getAttribute('data-markdown') === 'string';
    }

    popup.postMessage(JSON.stringify(messageData), '*');
  }

  function openNotes() {
    if (popup && !popup.closed) {
      popup.focus();
      return;
    }

    popup = window.open('about:blank', 'reveal.js - Notes', 'width=1100,height=700');
    // popup.marked = marked;
    popup.document.write(speakerViewHTML);

    if (!popup) {
      alert('Speaker view popup failed to open. Please make sure popups are allowed and reopen the speaker view.');
      return;
    }

    /**
     * Connect to the notes window through a postmessage handshake.
     * Using postmessage enables us to work in situations where the
     * origins differ, such as a presentation being opened from the
     * file system.
     */
    function connect() {
      // Keep trying to connect until we get a 'connected' message back
      connectInterval = setInterval(function () {
        popup.postMessage(
          JSON.stringify({
            namespace: 'reveal-notes',
            type: 'connect',
            url:
              window.location.protocol +
              '//' +
              window.location.host +
              window.location.pathname +
              window.location.search,
            state: deck.getState(),
          }),
          '*'
        );
      }, 500);

      window.removeEventListener('message', revealMessageListener);
      window.addEventListener('message', revealMessageListener);
    }

    connect();
  }

  return {
    id: 'notes',

    init: function (reveal) {
      deck = reveal;

      if (!/receiver/i.test(window.location.search)) {
        // If the there's a 'notes' query set, open directly
        if (window.location.search.match(/(\?|\&)notes/gi) !== null) {
          openNotes();
        }

        // Open the notes when the 's' key is hit
        deck.addKeyBinding({ keyCode: 83, key: 'S', description: 'Speaker notes view' }, function () {
          openNotes();
        });
      }
    },

    open: openNotes,
  };
};

export default Plugin;
