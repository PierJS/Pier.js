sRTC = {
	cfg:{'iceServers':[{'url':'stun:23.21.150.121'}]},
	con:{'optional': [{'DtlsSrtpKeyAgreement': true}]},
	pc1:new RTCPeerConnection(sRTC.cfg, sRTC.con),
	dc1:null,
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
		onconnection:[function(){
			console.log("Connected to datachannel!");
		}],
		onerror:[function(e) {
			switch (e.type) {
				case 'file':
					console.error('Protocol doesn\'t support file sending/receiving!');
					break;
			}
		}]
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
						sRTC.handleError('file');
					} else {
						sRTC.handle('onreceiveJSON')(data);
					}
				}
			}
		} catch (e) {
			console.warn("No data channel (pc1)", e);
		}
	},
	createLocalOffer:function() {
		sRTC.setupDC1()
		sRTC.pc1.createOffer(function(desc) {
			sRTC.setLocalDescription(desc, function(){});
			console.log("Created local offer", desc);
		}, function() {
			console.warn("Couldn't create offer");
		})
	},
	init:function() {
		sRTC.pc1.onicecandidate = function(e){
			console.log('ICE candidate (pc1)', e);
		}

		sRTC.pc1.onconnection = function() {};
	}
}