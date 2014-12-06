window.moz = !! navigator.mozGetUserMedia;

var RTCMultiSession = function(options) {
    return {
	send: function (message) {
	    if (moz && message.file)
		data = message.file;
            else
		data = JSON.stringify(message);

	    activedc.send(data);
	}
    }
};