sRTC = {
	cfg:{'iceServers':[{'url':'stun:23.21.150.121'}]},
	con:{'optional': [{'DtlsSrtpKeyAgreement': true}]},
	pc1:new RTCPeerConnection(sRTC.cfg, sRTC.con),
	pc2:new RTCPeerConnection(sRTC.cfg, sRTC.con),
	dc1:null,
	dc2:null,
	tn1:null,
	tn2:null,
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
		messageReceived:[function(m){
			console.log(m);
		}],
		channelConnected:[function(){
			console.log('Channel connected!')
		}],
		onaddstream:[function(e) {
			console.log("Error: addstream feature not supported");;
		}],
		onicecandidate_pc1:[function(e){
			console.log('ICE candidate (pc1)', e);
			if (e.candidate == null) {
				sRTC.handle('pc1LocalDescNeeded')(pc1.localDescription);
			}
		}],
		onicecandidate_pc2:[function (e){
			console.log("ICE candidate (pc2)", e);
			if (e.candidate == null) {
				sRTC.handle('pc2LocalDescNeeded')(pc2.localDescription);
			}
		}],
		pc2LocalDescNeeded:[function(localDesc) {
			console.log("Local description: ", localDesc);
		}],
		pc2LocalDescNeeded:[function(localDesc) {
			console.log("Local description: ", localDesc);
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
		datachannelCreated:[function(pc){
			console.log("Received datachannel (" + pc + ")");
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
			sRTC.activedc = sRTC.dc2;
			sRTC.handle("datachannelCreated")('pc2');
			sRTC.dc2.onopen = sRTC.handle('channelConnected');
			sRTC.dc2.onmessage = function (e) {
				if (e.data.size) {
					sRTC.handle('onerror')('file');
				} else {
					var data = JSON.parse(e.data);
					if (data.type == 'file') {
						sRTC.handle('onerror')('file');
					} else {
						sRTC.handle('messageReceived')(data.message);
					}
					// Scroll chat text area to the bottom on new input.
				}
			};
		}],

	},
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
			sRTC.handle("datachannelCreated")('pc1');
			sRTC.dc1.onopen = sRTC.handle('channelConnected');
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
						sRTC.handle('onerror')('file');
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
		sRTC.pc1.onicecandidate = sRTC.handle('onicecandidate_pc1');
		sRTC.pc1.onconnection = sRTC.handle('onconnection');
		sRTC.pc1.onsignalingstatechange = sRTC.handle('onsignalingstatechange');
		sRTC.pc1.oniceconnectionstatechange = sRTC.handle('oniceconnectionstatechange');
		sRTC.pc1.onicegatheringstatechange = sRTC.handle('onicegatheringstatechange');
		sRTC.pc2.onicecandidate = sRTC.handle('onicecandidate_pc2');
		sRTC.pc2.onsignalingstatechange = sRTC.handle('onsignalingstatechange');
		sRTC.pc2.oniceconnectionstatechange = sRTC.handle('oniceconnectionstatechange');
		sRTC.pc2.onicegatheringstatechange = sRTC.handle('onicegatheringstatechange');
	}
}
