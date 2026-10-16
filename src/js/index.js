const DEFAULT_FILE_VOC = "../sounds/BreakFreeSample_voc.mp3"
const DEFAULT_FILE_MUS = "../sounds/BreakFreeSample_mus.mp3"

var audioContext = null;
var isPlaying = false;
var vocalNode = null;
var musicNode = null;
var analyser = null;
var micAnalyser = null;
var vocalBuffer = null;
var musicBuffer = null;
var mediaStreamSource = null;
var myTimeout = null;
var hueAngle = 0;
var withFilter = false;
var pitches = [];
var recording = true;
var offset = 0;
var score = 0;
var scoreScale=1;

var detectorElem, 
  canvasElem,
  waveCanvas,
  pitchElem,
  noteElem,
  detuneElem,
  detuneAmount,
  pitchBoard,
  songBoard,
  particleFX;

window.onload = function() {
  audioContext = new AudioContext(); // initialize audio
  loadDefaultFile(DEFAULT_FILE_VOC, true);
  loadDefaultFile(DEFAULT_FILE_MUS, false);
  sketchInit()

  
  detectorElem = document.getElementById( "detector" );
  canvasElem = document.getElementById( "output" );
  waveCanvas = document.getElementById( "waveform" ).getContext("2d");
  waveCanvas.strokeStyle = "black";
  waveCanvas.lineWidth = 1;
  pitchElem = document.getElementById( "pitch" );
  noteElem = document.getElementById( "note" );
  detuneElem = document.getElementById( "detune" );
  detuneAmount = document.getElementById( "detune_amt" );
  pitchBoard = document.getElementById("pitchBoard");
  pitchBoard.width = window.innerWidth;
  songBoard = document.getElementById("songBoard");
  songBoard.width = window.innerWidth;

  
}

/* -- Insert stuff here -- */


function startKaraoke() {
  if(!isPlaying)
  {
    // get mic input
  getMicInputStream(
    {
          "audio": {
              "mandatory": {
                  "googEchoCancellation": "false",
                  "googAutoGainControl": "false",
                  "googNoiseSuppression": "false",
                  "googHighpassFilter": "false"
              },
              "optional": []
          },
      }, gotStream);
      // start audio playback
      vocalNode = audioContext.createBufferSource();
      musicNode = audioContext.createBufferSource();
      vocalNode.buffer = vocalBuffer;
      musicNode.buffer = musicBuffer;
  
      loadJSONFile('sounds/demo.json');
      
  }

}

function gotStream(stream) {
  // Create an AudioNode from the stream.
  mediaStreamSource = audioContext.createMediaStreamSource(stream);

  // Connect it to the destination.
  micAnalyser = audioContext.createAnalyser();
  micAnalyser.fftSize = 2048;
  mediaStreamSource.connect(micAnalyser);
  analysePitch(micAnalyser);
}

function stopKaraoke() {
  vocalNode.stop( 0 );
  musicNode.stop( 0 );
  vocalNode = null;
  musicNode = null;
  analyser = null;
  micAnalyser = null;
  score = 0;
  offset = 0;
  isPlaying = false;
  if (!window.cancelAnimationFrame)
  window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
    window.cancelAnimationFrame( rafID );
}

function analysePitch(mic) {
  if(mic)
  {
    micAnalyser.getFloatTimeDomainData( buf );
  }
  else
  {
    analyser.getFloatTimeDomainData( buf );
  }
  var ac = autoCorrelate( buf, audioContext.sampleRate );
  updatePitch(ac);
  // if(recording){pitches.push(ac);}
  // else {
     drawSongBoard(offset++)
    var averageClosePitches = (pitches[offset-1] + pitches[offset-2]) / 2;
  if(Math.abs(ac - averageClosePitches) < 60 && ac != -1) {
    var scoreGain = 1
    if(Math.abs(ac - averageClosePitches)< 6)
    {
      scoreGain = 2;
      scoreScale+=0.1
    }
    var myPitch = (10/94)*ac - (600/94); 
    score += scoreGain + Math.floor(Math.log(consecutive+1))
    consecutive++;
    scoreScale+=0.1
    shootParticles(200,500-myPitch*7 - 20);

    $("#scoreMeter").text(score);
    $("#scoreMeter").css("color",`rgb(${consecutive*20},0,0)`)
  }
  else {
    consecutive = 0;
    scoreScale = 1;
    $("#scoreMeter").css("color",`rgb(0,0,0)`)

  }
  $("scoreMeter").css("transform",`scale(${scoreScale})`)
  // };
}

function drawWaveform()
{
  // waveform visualization
  waveCanvas.clearRect(0,0,512,256);
  waveCanvas.strokeStyle = "black";
  waveCanvas.moveTo(0,buf[0]);
  waveCanvas.beginPath();
  for (var i=1;i<512;i++) {
    waveCanvas.lineTo(i,250+(buf[i]*128));
  }
  waveCanvas.stroke();
}

function updatePitch(ac) {
  var myPitch = (10/94)*ac - (600/94)
  if(ac > 0)
  {
    var pitchCanvas = pitchBoard.getContext("2d");
    pitchCanvas.save()
    
    // fade out previous frame
    pitchCanvas.globalAlpha = 1;
    pitchCanvas.globalCompositeOperation = "destination-in";
    pitchCanvas.fillStyle = `rgba(0, 0, 0, 0.6)`;
    pitchCanvas.fillRect(0, 0, pitchBoard.width, pitchBoard.height);
    pitchCanvas.restore()
    
    // draw new position
    pitchCanvas.beginPath()
    pitchCanvas.fillStyle = "rgb(200,0,0)";
    if(hueAngle < 360) {hueAngle += 1;}
    else {hueAngle = 0}
    pitchCanvas.filter = `hue-rotate(${hueAngle}deg)`
    pitchCanvas.arc(200,500-(myPitch*7), 20, 0, 2 * Math.PI);
    pitchCanvas.fill();
    pitchCanvas.strokeStyle = "white";
    pitchCanvas.lineWidth = 5;
    pitchCanvas.stroke();
    if(myTimeout == null){
      myTimeout = setTimeout(()=>{pitchCanvas.clearRect(0, 0, pitchBoard.width, pitchBoard.height); myTimeout = null},500);
    }

  }
  
  if (ac == -1) {
    detectorElem.className = "vague";
    pitchElem.innerText = "--";
    noteElem.innerText = "-";
    detuneElem.className = "";
    detuneAmount.innerText = "--";
  } else {
    detectorElem.className = "confident";
    pitch = ac;
    pitchElem.innerText = Math.round( pitch ) ;
    var note =  noteFromPitch( pitch );
    noteElem.innerHTML = noteStrings[note%12];
    var detune = centsOffFromPitch( pitch, note );
    if (detune == 0 ) {
      detuneElem.className = "";
      detuneAmount.innerHTML = "--";
    } else {
      if (detune < 0)
        detuneElem.className = "flat";
      else
        detuneElem.className = "sharp";
      detuneAmount.innerHTML = Math.abs( detune );
    }
  }

  if (!window.requestAnimationFrame)
    window.requestAnimationFrame = window.webkitRequestAnimationFrame;
  rafID = window.requestAnimationFrame( analysePitch );
}

function getMicInputStream(dictionary, callback) {
  try {
      navigator.getUserMedia = 
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia;
      navigator.getUserMedia(dictionary, callback, ()=>{alert('Stream generation failed.')});
  } catch (e) {
      alert('getUserMedia threw exception :' + e);
  }
}

function loadDefaultFile(filePath, voice)
{
  var request = new XMLHttpRequest();
  request.open("GET", filePath, true);
  request.responseType = "arraybuffer";
  request.onload = function() {
    audioContext.decodeAudioData( request.response, (buffer) => { 
      if(voice){
        vocalBuffer = buffer;
      }
      else
      {
        musicBuffer = buffer;
      }
    } );
  }
  request.send();
}

function loadJSONFile(filePath)
{
  var request = new XMLHttpRequest();
  request.open("GET", filePath, true);
  request.responseType = "json";
  request.onload = function() {
    pitches = request.response
    routeSource(vocalNode, false);
      musicNode.connect(audioContext.destination)
      vocalNode.start( 0 );
      musicNode.start( 0 );
      isPlaying = true;
      analysePitch(true);
      drawWaveform();
  }
  request.send();
}

function routeSource(mediaSource)
{
  lowfilter = audioContext.createBiquadFilter();
  var gainNode = audioContext.createGain();
  gainNode.gain.value =0.3;

  lowfilter.type = "lowpass";
  lowfilter.frequency = 1000;

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;

  if(withFilter){
  mediaSource.connect(lowfilter)
  lowfilter.connect( analyser);
  } else {
  mediaSource.connect( analyser );
  }
  analyser.connect(gainNode);
  gainNode.connect( audioContext.destination );
}

var Particle = function(x, y, intensity) {
  this.init(x,y);
}

function shootParticles(x,y)
{
  var i;

    for ( i = 0; i < random(1,4); i++ ) {
      particleFX.spawn( x, y );
    }
}

function drawSongBoard(offset) {
  var currentPosition = 1600;
  var speedFactor = 5;
  var playheadX = 200;
  var pitchToDraw = (currentPosition/speedFactor) - (playheadX/speedFactor) + offset;
  var songCanvas = songBoard.getContext("2d");
  songCanvas.strokeStyle = '#1473E6';
  if(!pitches.length<=pitchToDraw)songCanvas.clearRect(0, 0, pitchBoard.width, pitchBoard.height);
  songCanvas.beginPath();
  songCanvas.moveTo(800,0);
  while(currentPosition > playheadX) {
    if(pitches.length<=pitchToDraw) {
      
    }
    else {
      var currentPitch = pitches[pitchToDraw]
      if(currentPitch > 0){
      var myPitch = (10/94)*pitches[pitchToDraw] - (600/94)
      songCanvas.moveTo(currentPosition,500-(myPitch*7));
      songCanvas.lineTo(currentPosition+20, 500-(myPitch*7))
      }
    }
    currentPosition-=speedFactor;
    pitchToDraw = (currentPosition/speedFactor) - (playheadX/speedFactor) + offset;
  }
  songCanvas.lineWidth = 20;
  songCanvas.stroke();
}

Particle.prototype = {

  init: function( x, y, radius ) {

      this.alive = true;

      this.radius = radius || 10;
      this.wander = 0.15;
      this.theta = random( TWO_PI );
      this.drag = 0.92;
      this.color = '#fff';

      this.x = x || 0.0;
      this.y = y || 0.0;

      this.vx = 0.0;
      this.vy = 0.0;
  },

  move: function() {

      this.x += this.vx;
      this.y += this.vy;

      this.vx *= this.drag;
      this.vy *= this.drag;

      this.theta += random( -0.5, 0.5 ) * this.wander;
      this.vx += sin( this.theta ) * 0.1;
      this.vy += cos( this.theta ) * 0.1;

      this.radius *= 0.96;
      this.alive = this.radius > 0.5;
  },

  draw: function( ctx ) {

      ctx.beginPath();
      ctx.arc( this.x, this.y, this.radius, 0, TWO_PI );
      ctx.fillStyle = this.color;
      ctx.fill();
  }
};

function sketchInit(){
  var MAX_PARTICLES = 20;
  var COLOURS = [ '#69D2E7', '#A7DBD8', '#E0E4CC', '#F38630', '#FA6900', '#FF4E50', '#F9D423' ];

  var particles = [];
  var pool = [];

  particleFX = Sketch.create({
      container: document.getElementById('particleContainer'),
      retina: 'auto'
  });

  particleFX.setup = function() {
  };

  particleFX.spawn = function( x, y ) {
      
      var particle, theta, force;

      if ( particles.length >= MAX_PARTICLES )
          pool.push( particles.shift() );

      particle = pool.length ? pool.pop() : new Particle();
      particle.init( x, y, random( 5, 40 ) );

      particle.wander = random( 0.5, 2.0 );
      particle.color = random( COLOURS );
      particle.drag = random( 0.9, 0.99 );

      theta = random( TWO_PI );
      force = random( 2, 8 );

      particle.vx = sin( theta ) * force;
      particle.vy = cos( theta ) * force;

      particles.push( particle );
  };

  particleFX.update = function() {

      var i, particle;

      for ( i = particles.length - 1; i >= 0; i-- ) {

          particle = particles[i];

          if ( particle.alive ) particle.move();
          else pool.push( particles.splice( i, 1 )[0] );
      }
  };

  particleFX.draw = function() {

      particleFX.globalCompositeOperation  = 'lighter';

      for ( var i = particles.length - 1; i >= 0; i-- ) {
          particles[i].draw( particleFX );
      }
  };

}
  





function toggleLiveInput() {
  if (isPlaying) {
      //stop playing and return
      vocalNode.stop( 0 );
      musicNode.stop( 0 );
      vocalNode = null;
      musicNode = null;
      analyser = null;
      isPlaying = false;
  if (!window.cancelAnimationFrame)
    window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
      window.cancelAnimationFrame( rafID );
  }
  // used to get mic input from the user
  getMicInputStream(
    {
          "audio": {
              "mandatory": {
                  "googEchoCancellation": "false",
                  "googAutoGainControl": "false",
                  "googNoiseSuppression": "false",
                  "googHighpassFilter": "false"
              },
              "optional": []
          },
      }, gotStream);
}

function togglePlayback() {
  if (isPlaying) {
      //stop playing and return
      vocalNode.stop( 0 );
      musicNode.stop( 0 );
      offset = 0;
      vocalNode = null;
      musicNode = null;
      analyser = null;
      isPlaying = false;
  if (!window.cancelAnimationFrame)
    window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
      window.cancelAnimationFrame( rafID );
      return "start";
  }

  vocalNode = audioContext.createBufferSource();
  musicNode = audioContext.createBufferSource();
  vocalNode.buffer = vocalBuffer;
  musicNode.buffer = musicBuffer;

  routeSource(vocalNode, false);
  musicNode.connect(audioContext.destination)
  vocalNode.start( 0 );
  musicNode.start( 0 );
  isPlaying = true;
  analysePitch();
  drawWaveform();
  return "stop";
}

/** THE FOLLOWING CONTAINS THE STYLING WE'RE AFTER, BUT DOESN'T WORK CURRENTLY.
  * KEEPING IT FOR REFERENCE
  * */

// Particle.prototype = {

//   init: function(x,y) {
//     this.x = x + random(-10, 10);
//     this.y = y + random(-10, 10);
//     this.vx = random(-2.5, 2.5);
//     this.vy = random(-5, 5);
//     this.radius = (random() > 0.75) ? random(25, 50) : 1 + random(1, 20);
//     this.radius *= 1.2;
//     this.lifespan = random(25, 50);
//     this.charge = this.lifespan;
//     this.color = {
//       r: round(random(255)),
//       g: round(random(75)),
//       b: round(random(50))
//     };
//   },

//  update: function() {
//    this.charge--;
//    this.radius--;
//    this.x += this.vx;
//    this.y += this.vy;
//  },

//  draw: function(ctx) {

//    var gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
//    gradient.addColorStop(0, 'rgba(' + this.color.r + ', ' + this.color.g + ', ' + this.color.b + ', ' + this.opacity + ')');
//    gradient.addColorStop(0.5, "rgba(" + this.color.r + ", " + this.color.g + ", " + this.color.b + ", " + this.opacity + ")");
//    gradient.addColorStop(1, "rgba(" + this.color.r + ", " + this.color.g + ", " + this.color.b + ", 0)");

//    ctx.fillStyle = gradient;
//    ctx.beginPath();

//    ctx.arc(this.x, this.y, this.radius, 0, TWO_PI, false);
//    ctx.fill();
//  }
// };

// resetParticles = function(x,y){
//     for (var i = 0; i < 35; i++) {
//     this.particles.push(new Particle(x,y));
//   }
// }


// function initSketch(){
// sketch = Sketch.create({
//     container: document.getElementById('pitchBoard'),
//     center: {},
//     setup: function() {
      
//       this.resize();
      
//       x = this.width * 0.5;
//       y = this.height * 0.5;
      
//     },

//     resize: function() {
//       this.center.x = this.width * 0.5;
//       this.center.y = this.height * 0.5;
//     },

//     draw: function() {

//       this.globalCompositeOperation = "source-over";
//       this.fillStyle = '#0A0B1F';
//       this.fillRect(0, 0, this.width, this.height);
//       this.globalCompositeOperation = "lighter";

//       var p, i = particles.length;
      
//       while (i--) {
//         p = particles[i];
//         p.opacity = round(p.charge / p.lifespan * 100) / 100;
//         p.draw(this);
//         p.update();
//         if (p.charge < 0 || p.radius < 0) {
//               particles.splice(i, 1);
//         }
//       }

//     }
//   });

// }

//bill's code

$(document).ready(function() {
	$('[data-toggle="tooltip"]').tooltip();
});

$('#songsTable').on('click', 'tbody tr', function(event) {
  $(this).addClass('highlight').siblings().removeClass('highlight');
  $('.playSong').prop('disabled', '');
});

$('#songsListModal').on('hidden.bs.modal', function (e) {
  $('.highlight').removeClass('highlight');
});

$(document).on('click', '.playButton', function(){
	if ($('.playIcon').text() == "play_arrow") {
		$('.playIcon').text('pause');
    $('.playButton').attr('onclick', 'stopKaraoke()');
		moveLyrics(100000);
	} else {
		$('.playIcon').text('play_arrow');
		stopLyrics();
    $('.playButton').attr('onclick', 'startKaraoke()');
	}
});

$(document).on('click', '.playSong', function(){
	$(this).text('Starting in 3...').prop('disabled','disabled');
	setTimeout(function() {
		$('.playSong').text('Starting in 2...')
	}, 1000);
	setTimeout(function() {
		$('.playSong').text('Starting in 1...')
	}, 2000);
	setTimeout(function() {
		$('#songsListModal').modal('hide');
		$('.playIcon').text('pause');
		togglePlayback();
		setTimeout(function() {
			$('.songsListBtn').blur();
		}, 700);
		moveLyrics(100000);
	}, 3000);

});

function moveLyrics(time) {
	console.log('started');
	/*$('.lyricsDiv').animate({
		scrollTop: $('#lyricsEnd').offset().top
	}, time);*/
}

function stopLyrics() {
	console.log('stopped');
	$('.lyricsDiv').stop();
}