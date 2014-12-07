window.sRTC = {
	cfg:{'iceServers':[{'url':'stun:23.21.150.121'}]},
	con:{'optional': [{'DtlsSrtpKeyAgreement': true}]},
	dc1:null,
	dc2:null,
	tn1:null,
	tn2:null,
	log:function(a, b, c, d) { // this is really dirty
		if (this.debug) {
			if (d) {
				console[a](b, c, d);
			} else if (c) {
				console[a](b, c);
			} else {
				console[a](b);
			}
		}
	},
	handle:function(evt, params) {
		sRTC.log('log',evt);
		return function(a,b,c) {
			for (var i = 0; i < sRTC.handlers[evt].length; i++) {
				sRTC.handlers[evt][i](a,b,c);
			}
		}
	},
	sendJSON:function(JSO){
		sRTC.activedc.send(JSON.stringify(JSO));
	},
	handlers: {
		onreceiveJSON:[function(json) {
			sRTC.log('log','Message received!');
			sRTC.log('log',json);
		}],
		onsignalingstatechange:[function(state) {
			sRTC.log('info','signaling state change:', state);
		}],
		oniceconnectionstatechange:[function(state) {
			sRTC.log('info','ice connection state change:', state);
		}],
		onicegatheringstatechange:[function(state) {
			sRTC.log('info','ice gathering state change:', state);
		}],
		messageReceived:[function(m){
			sRTC.log('log',m);
		}],
		channelConnected:[function(){
			sRTC.log('log','Channel connected!')
		}],
		onaddstream:[function(e) {
			sRTC.log('log',"Error: addstream feature not supported");;
		}],
		onicecandidate_pc1:[function(e){
			sRTC.log('log','ICE candidate (pc1)', e);
			if (e.candidate == null) {
				sRTC.handle('pc1LocalDescNeeded')(sRTC.pc1.localDescription);
			}
		}],
		onicecandidate_pc2:[function (e){
			sRTC.log('log',"ICE candidate (pc2)", e);
			if (e.candidate == null) {
				sRTC.handle('pc2LocalDescNeeded')(sRTC.pc2.localDescription);
			}
		}],
		pc1LocalDescNeeded:[function(localDesc) {
			sRTC.log('log',"Local description: ", localDesc);
		}],
		pc2LocalDescNeeded:[function(localDesc) {
			sRTC.log('log',"Local description: ", localDesc);
		}],
		onconnection:[function(){
			sRTC.log('log',"Connected to datachannel!");
		}],
		localOfferCreated:[function(a){
			sRTC.log('log','Created offer: ', a)
		}],
		localOfferFailed:[function(){
			sRTC.log('log','Creation of local offer failed!')
		}],
		datachannelCreated:[function(pc){
			sRTC.log('log',"Received datachannel (" + pc + ")");
		}],
		onerror:[function(e) {
			switch (e.type) {
				case 'file':
					sRTC.log('error','Protocol doesn\'t support file sending/receiving!');
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
			sRTC.log('log','Created datachannel (pc1)');
			sRTC.handle("datachannelCreated")('pc1');
			sRTC.dc1.onopen = sRTC.handle('channelConnected');
			sRTC.dc1.onmessage = function(e) {
				sRTC.log('log','Received message (pc1)', e.data);
				if (e.data.size) {
					sRTC.handle('onerror')('file');
				} else {
					if (e.data.charCodeAt(0) == 2) {
						// The first message received from FireFox is literal ASCII 2, we don't bother using this message.
						return;
					}

					sRTC.log('log',e);
					var data = JSON.parse(e.data);
					if (data.type == 'file') {
						sRTC.handle('onerror')('file');
					} else {
						sRTC.handle('onreceiveJSON')(data);
					}
				}
			}
		} catch (e) {
			sRTC.log('warn',"No data channel (pc1)", e);
		}
	},
	handleOfferFromPC1:function(offerDesc){
		sRTC.pc2.setRemoteDescription(new RTCSessionDescription(offerDesc));
		sRTC.pc2.createAnswer(function (answerDesc) {
			sRTC.log('log',"Created local answer: ", answerDesc);
			sRTC.pc2.setLocalDescription(new RTCSessionDescription(answerDesc));
		}, function () { sRTC.log('warn',"No create answer"); });
	},
	createLocalOffer:function() {
		sRTC.setupDC1()
		sRTC.pc1.createOffer(function(desc) {
			sRTC.pc1.setLocalDescription(desc, function(){});
			sRTC.log('log',"Created local offer", desc);
			sRTC.handle('localOfferCreated')(desc);
		}, function() {
			sRTC.log('warn',"Couldn't create offer");
			sRTC.handle('localOfferFailed')();
		})
	},
	handleAnswerFromPC2:function(answerDesc) {
		sRTC.log('log',"Received remote answer: ", answerDesc);
		sRTC.pc1.setRemoteDescription(new RTCSessionDescription(answerDesc));
	},
	init:function(configs) {
		// configs
		this.debug = false;
		for (var i in configs) {
			this[i] = configs[i];
		}

		sRTC.pc1 = new RTCPeerConnection(sRTC.cfg, sRTC.con);
		sRTC.pc2 = new RTCPeerConnection(sRTC.cfg, sRTC.con);
 
		sRTC.pc1.onicecandidate = sRTC.handle('onicecandidate_pc1');
		sRTC.pc1.onconnection = sRTC.handle('onconnection');
		sRTC.pc1.onsignalingstatechange = sRTC.handle('onsignalingstatechange');
		sRTC.pc1.oniceconnectionstatechange = sRTC.handle('oniceconnectionstatechange');
		sRTC.pc1.onicegatheringstatechange = sRTC.handle('onicegatheringstatechange');
		sRTC.pc2.onicecandidate = sRTC.handle('onicecandidate_pc2');
		sRTC.pc2.onsignalingstatechange = sRTC.handle('onsignalingstatechange');
		sRTC.pc2.oniceconnectionstatechange = sRTC.handle('oniceconnectionstatechange');
		sRTC.pc2.onicegatheringstatechange = sRTC.handle('onicegatheringstatechange');
		sRTC.pc2.ondatachannel = sRTC.handle('ondatachannel');
	}
}