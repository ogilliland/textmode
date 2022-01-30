function Color( rOrHex = 0, g = 0, b = 0 ) {

	if (typeof rOrHex == 'string') {

		var components = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(rOrHex);
		this.r = parseInt(components[1], 16);
		this.g = parseInt(components[2], 16);
		this.b = parseInt(components[3], 16);

	} else {

		this.r = rOrHex;
		this.g = g;
		this.b = b;

	}

}

export { Color };
