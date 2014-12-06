sRTC = {
	cfg:{'iceServers':[{'url':'stun:23.21.150.121'}]},
	con:{'optional': [{'DtlsSrtpKeyAgreement': true}]},
	pc1:new RTCPeerConnection(sRTC.cfg, sRTC.con),
	dc1:null,
	tn1:null,
	handlers: {
		onReceiveJSON:[function(json) {
			console.log('Message received!');
			console.log(json);
		}]
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
					sRTC.handleError('file');
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
						for (var i = 0; i < sRTC.handlers.onReceiveJSON) {
							sRTC.handlers.onReceiveJSON[i](data);
						}
					}
				}
			}
		} catch (e) {
			console.warn("No data channel (pc1)", e);
		}
	},
	handleError:function(e) {
		switch (e.type) {
			case 'file':
				console.error('Protocol doesn\'t support file sending/receiving!');
				break;
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
	handleOnConnection:function(){
		console.log("Connected to datachannel!");
	},
	init:function() {
		sRTC.pc1.onicecandidate = function(e){
			console.log('ICE candidate (pc1)', e);
		}

		sRTC.pc1.onconnection = sRTC.handleOnConnection;
	}
	onsignalingstatechange:function(state) {
		console.info('signaling state change:', state);
	},
	oniceconnectionstatechange:function(state) {
		console.info('ice connection state change:', state);
	},
	onicegatheringstatechange:function(state) {
		console.info('ice gathering state change:', state);
	}
}