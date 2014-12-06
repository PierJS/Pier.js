var RTCPeerConnection = null;
var getUserMedia = null;
var attachMediaStream = null;
var reattachMediaStream = null;
var webrtcDetectedBrowser = null;

if (navigator.mozGetUserMedia) {
  console.log("This appears to be Firefox");

  webrtcDetectedBrowser = "firefox";

  // The RTCPeerConnection object.
  RTCPeerConnection = mozRTCPeerConnection;

  // The RTCSessionDescription object.
  RTCSessionDescription = mozRTCSessionDescription;

  // The RTCIceCandidate object.
  RTCIceCandidate = mozRTCIceCandidate;

  // Get UserMedia (only difference is the prefix).
  // Code from Adam Barth.
  getUserMedia = navigator.mozGetUserMedia.bind(navigator);

  // Attach a media stream to an element.
  attachMediaStream = function(element, stream) {
    console.log("Attaching media stream");
    element.mozSrcObject = stream;
    element.play();
  };

  reattachMediaStream = function(to, from) {
    console.log("Reattaching media stream");
    to.mozSrcObject = from.mozSrcObject;
    to.play();
  };

  // Fake get{Video,Audio}Tracks
  MediaStream.prototype.getVideoTracks = function() {
    return [];
  };

  MediaStream.prototype.getAudioTracks = function() {
    return [];
  };
} else if (navigator.webkitGetUserMedia) {
  console.log("This appears to be Chrome");

  webrtcDetectedBrowser = "chrome";

  // The RTCPeerConnection object.
  RTCPeerConnection = webkitRTCPeerConnection;
  
  // Get UserMedia (only difference is the prefix).
  // Code from Adam Barth.
  getUserMedia = navigator.webkitGetUserMedia.bind(navigator);

  // Attach a media stream to an element.
  attachMediaStream = function(element, stream) {
    element.src = webkitURL.createObjectURL(stream);
  };

  reattachMediaStream = function(to, from) {
    to.src = from.src;
  };

  // The representation of tracks in a stream is changed in M26.
  // Unify them for earlier Chrome versions in the coexisting period.
  if (!webkitMediaStream.prototype.getVideoTracks) {
    webkitMediaStream.prototype.getVideoTracks = function() {
      return this.videoTracks;
    };
    webkitMediaStream.prototype.getAudioTracks = function() {
      return this.audioTracks;
    };
  }

  // New syntax of getXXXStreams method in M26.
  if (!webkitRTCPeerConnection.prototype.getLocalStreams) {
    webkitRTCPeerConnection.prototype.getLocalStreams = function() {
      return this.localStreams;
    };
    webkitRTCPeerConnection.prototype.getRemoteStreams = function() {
      return this.remoteStreams;
    };
  }
} else {
  console.log("Browser does not appear to be WebRTC-capable");
}

sRTC = {

	cfg:{'iceServers':[{'url':'stun:23.21.150.121'}]},
	con:{'optional': [{'DtlsSrtpKeyAgreement': true}]},
	pc1:new RTCPeerConnection(sRTC.cfg, sRTC.con),
	pc2:new RTCPeerConnection(sRTC.cfg, sRTC.con),
	dc1:null,
	dc2:null,
	tn1:null,
	handle:function(evt, params) {
		return function(a,b,c) {
			for (var i = 0; i < sRTC.handlers[evt].length; i++) {
				sRTC.handlers[evt][i](a,b,c);
			}
		}
	}
	handlers: {
		onreceiveJSON:[function(json) {
			console.log('Message received!');
			console.log(json);
		}],
		onsignalingstatechange:[function(state) {
			console.info('signaling state change:', state);
		}],
		oniceconnectionstatechange:[function(state) {
			console.info('ice connection state change:', state);
		}],
		onicegatheringstatechange:[function(state) {
			console.info('ice gathering state change:', state);
		}],
		onicecandidate:[function(e){
			console.log('ICE candidate (pc1)', e);
		}],
		onconnection:[function(){
			console.log("Connected to datachannel!");
		}],
		localOfferCreated:[function(a){
			console.log('Created offer: ', a)
		}],
		localOfferFailed:[function(){
			console.log('Creation of local offer failed!')
		}],
		onerror:[function(e) {
			switch (e.type) {
				case 'file':
					console.error('Protocol doesn\'t support file sending/receiving!');
					break;
			}
		}],
                ondatachannel:[function(e) {
                    var datachannel = e.channel || e; // Chrome sends event, FF sends raw channel
                    sRTC.dc2 = datachannel;
                    var activedc = sRTC.dc2;
                    sRTC.dc2.onopen = function (e) {
                        console.log('data channel connect');
                        $('#waitForConnection').remove();
                    }
                    sRTC.dc2.onmessage = function (e) {
                        var data = JSON.parse(e.data);
                        console.log("recieved: "+ data.message);
                        // Scroll chat text area to the bottom on new input.
                    };
                }],

	},
	handshake: {
		handleAnswerFromPC2:function() {

		}
	}
	addEventListener:function(evt, fn) {
		sRTC.handlers[evt].push(fn);
	},
 
	removeEventListener:function(evt, fn) { // can probably do this better
		for (var i = 0; i < sRTC.handlers.length; i++) {
			if (sRTC.handlers[i] == fn) {
				sRTC.splice(i, 1);
				return;
			}
		}
	},
	setupDC1:function() {
		try {
			sRTC.dc1 = sRTC.pc1.createDataChannel('test', {reliable:true});
			sRTC.activedc = sRTC.dc1;
			console.log('Created datachannel (pc1)');
			sRTC.dc1.onopen = function(e) {
				console.log('Data channel connected');
			}

			sRTC.dc1.onmessage = function(e) {
				console.log('Received message (pc1)', e.data);
				if (e.data.size) {
					sRTC.handle('onerror')('file');
				} else {
					if (e.data.charCodeAt(0) == 2) {
						// The first message received from FireFox is literal ASCII 2, we don't bother using this message.
						return;
					}

					console.log(e);
					var data = JSON.parse(e.data);
					if (data.type == 'file') {
						sRTC.handle('error')('file');
					} else {
						sRTC.handle('onreceiveJSON')(data);
					}
				}
			}
		} catch (e) {
			console.warn("No data channel (pc1)", e);
		}
	},
        handleOfferFromPC1:function(offerDesc){
                sRTC.pc2.setRemoteDescription(offerDesc);
                sRTC.pc2.createAnswer(function (answerDesc) {
                    console.log("Created local answer: ", answerDesc);
                    sRTC.pc2.setLocalDescription(answerDesc);
                }, function () { console.warn("No create answer"); });
        },
	createLocalOffer:function() {
		sRTC.setupDC1()
		sRTC.pc1.createOffer(function(desc) {
			sRTC.setLocalDescription(desc, function(){});
			console.log("Created local offer", desc);
			sRTC.handle('localOfferCreated')(desc);
		}, function() {
			console.warn("Couldn't create offer");
			sRTC.handle('localOfferFailed')();
		})
	},
	answerFromClientReceived:function(answerJSO) {
		var answerDesc = new RTCSessionDescription(answerJSO);
		sRTC.handleAnswerFromPC2(answerDesc);
	},
	handleAnswerFromPC2:function(answerDesc) {
		console.log("Received remote answer: ", answerDesc);
		sRTC.pc1.setRemoteDescription(answerDesc);
	}
	init:function() {
		sRTC.pc1.onicecandidate = sRTC.handle('onicecandidate');
		sRTC.pc1.onconnection = sRTC.handle('onconnection');
		sRTC.pc1.onsignalingstatechange = sRTC.handle('onsignalingstatechange');
		sRTC.pc1.oniceconnectionstatechange = sRTC.handle('oniceconnectionstatechange');
		sRTC.pc1.onicegatheringstatechange = sRTC.handle('onicegatheringstatechange');
                sRTC.pc2.onsignalingstatechange = sRTC.handle('onsignalingstatechange');
		sRTC.pc2.oniceconnectionstatechange = sRTC.handle('oniceconnectionstatechange');
		sRTC.pc2.onicegatheringstatechange = sRTC.handle('onicegatheringstatechange');



	}
}
