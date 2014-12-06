window.moz = !! navigator.mozGetUserMedia;

function RTCMultiSession(options) {
	return {
		send: function (message) {
			if (moz && message.file)
				data = message.file;
			else
				data = JSON.stringify(message);

			sRTC.activedc.send(data);
		}
	}
};