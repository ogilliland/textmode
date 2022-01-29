import { vertexSource, fragmentSource } from './shaders.js';

function createCanvasElement() {

	const canvas = document.createElement( 'canvas' );
	canvas.style.display = 'block';

	// Draw crisp pixels without smoothing.
	canvas.style.imageRendering = '-moz-crisp-edges';
	canvas.style.imageRendering = '-webkit-crisp-edges';
	canvas.style.imageRendering = 'pixelated';
	canvas.style.imageRendering = 'crisp-edges';

	return canvas;

}

function Terminal( parameters = {} ) {

	const _width = parameters.width !== undefined ? parameters.width : 320;
	const _height = parameters.height !== undefined ? parameters.height : 200;
	const _scale = parameters.scale !== undefined ? parameters.scale : 1;
	const _charWidth = parameters.charWidth !== undefined ? parameters.charWidth : 8;
	const _charHeight = parameters.charHeight !== undefined ? parameters.charHeight : 8;

	// TO DO: Create a proper fallback font, either generated dynamically or included as base64 image data.
	// Currently fontURL is a mandatory field.
	const _fontUrl = parameters.fontUrl;

	let _numCharsX = Math.floor(_width / _charWidth);
	let _numCharsY = Math.floor(_height / _charHeight);

	const _canvas = createCanvasElement();
	_canvas.width = _width;
	_canvas.height = _height;
	_canvas.style.width = (_width * _scale) + 'px';
	_canvas.style.height = (_height * _scale) + 'px';

	//
	// Public properties
	//

	this.domElement = _canvas;

	//
	// Initialize
	//

	const _this = this;

	// Get canvas context.
	let _gl;

	try {

		_gl = _canvas.getContext( 'webgl' );

		if ( _gl === null ) {

			throw new Error( 'Unable to initialize WebGL. Your browser or machine may not support it.' );

		}

	} catch ( error ) {

		console.error( 'TEXTMODE.Terminal: ' + error.message );
		throw error;

	}

	// Helper function to create a shader of the given type, upload the source and compile it.
	function loadShader(gl, type, source) {

		const shader = gl.createShader( type );

		// Send the source to the shader object.
		gl.shaderSource( shader, source );

		// Compile the shader program.
		gl.compileShader( shader );

		// Check if it compiled successfully.
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			let infoLog = gl.getShaderInfoLog( shader );
			gl.deleteShader( shader );
			throw new Error( 'An error occurred while compiling the shader: ' + infoLog );
		}

		return shader;

	}

	// Initialize the fragment and vertex shader programs.
	function initShaderProgram( gl, vertexSource, fragmentSource ) {

		const vertexShader = loadShader( gl, gl.VERTEX_SHADER, vertexSource );
		const fragmentShader = loadShader( gl, gl.FRAGMENT_SHADER, fragmentSource );

		// Create the shader program.
		const shaderProgram = gl.createProgram();
		gl.attachShader( shaderProgram, vertexShader );
		gl.attachShader( shaderProgram, fragmentShader );
		gl.linkProgram( shaderProgram );

		// If creating the shader program failed, throw an error.
		if ( !gl.getProgramParameter(shaderProgram, gl.LINK_STATUS) ) {
			throw new Error( 'Unable to initialize shader program: ' + gl.getProgramInfoLog(shaderProgram) );
		}

		return shaderProgram;

	}

	let _programInfo;

	try {

		const _shaderProgram = initShaderProgram( _gl, vertexSource, fragmentSource );

		_programInfo = {
			program: _shaderProgram,
			attribLocations: {
				vertexPositionNDC: _gl.getAttribLocation( _shaderProgram, 'vertexPositionNDC' ),
			},
			uniformLocations: {
				numChars: _gl.getUniformLocation( _shaderProgram, 'numChars' ),
				fontTexture: _gl.getUniformLocation( _shaderProgram, 'fontTexture' ),
				glyphTexture: _gl.getUniformLocation( _shaderProgram, 'glyphTexture' ),
				foregroundColor: _gl.getUniformLocation( _shaderProgram, 'foregroundColor' ),
				backgroundColor: _gl.getUniformLocation( _shaderProgram, 'backgroundColor' )
			}
		};

	} catch ( error ) {

		console.error( 'TEXTMODE.Terminal: ' + error.message );
		throw error;

	}

	// Initialize position buffer for fullscreen quad.
	function initBuffers( gl ) {

		// Create a buffer for the quad's positions.
		const positionBuffer = gl.createBuffer();

		// Select the positionBuffer as the one to apply buffer operations to from now on.
		gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );

		// Create an array of vertices for the quad.
		const vertices = [
			// First triangle:
			1.0,  1.0,
			-1.0,  1.0,
			-1.0, -1.0,
			// Second triangle:
			-1.0, -1.0,
			1.0, -1.0,
			1.0,  1.0
		];

		// Pass the list of vertices into WebGL to build the shape.
		// We do this by creating a Float32Array from the JavaScript array, then use it to fill the current buffer.
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW );

		return {
			position: positionBuffer
		};
	}

	let _buffers = initBuffers(_gl);

	// Helper function to initialise a new texture.
	function initTexture( gl, width, height, rgb = true ) {

		const texture = gl.createTexture();
		gl.bindTexture( gl.TEXTURE_2D, texture );

		const numChannels = rgb ? 3 : 1;
		const level = 0;
		const internalFormat = rgb ? gl.RGB : gl.LUMINANCE;
		const border = 0;
		const srcFormat = rgb ? gl.RGB : gl.LUMINANCE;
		const srcType = gl.UNSIGNED_BYTE;
		const pixels = new Uint8Array( numChannels * width * height );

		gl.texImage2D(
			gl.TEXTURE_2D,
			level,
			internalFormat,
			width,
			height,
			border,
			srcFormat,
			srcType,
			pixels
		);

		// Set the filtering so we don't need mips and it's not filtered.
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );

		return {
			pixels: pixels,
			glTexture: texture,
			params: {
				numChannels: numChannels,
				level: level,
				internalFormat: internalFormat,
				width: width,
				height: height,
				border: border,
				srcFormat: srcFormat,
				srcType: srcType
			}
		};

	}

	// Used to load external images into WebGL textures.
	function loadTexture( gl, url ) {

		const texture = gl.createTexture();
		gl.bindTexture( gl.TEXTURE_2D, texture );

		// Because images have to be downloaded over the internet they might take a moment until they are ready.
		// Until then put a single pixel in the texture so we can use it immediately.
		// When the image has finished downloading we'll update the texture with the contents of the image.
		const level = 0;
		const internalFormat = gl.LUMINANCE;
		const width = 1;
		const height = 1;
		const border = 0;
		const srcFormat = gl.LUMINANCE;
		const srcType = gl.UNSIGNED_BYTE;
		const pixel = new Uint8Array(1);  // Single opaque black pixel.

		gl.texImage2D(
			gl.TEXTURE_2D,
			level,
			internalFormat,
			width,
			height,
			border,
			srcFormat,
			srcType,
			pixel
		);

		const image = new Image();
		image.onload = function() {

			gl.bindTexture( gl.TEXTURE_2D, texture );
			gl.texImage2D(
				gl.TEXTURE_2D,
				level,
				internalFormat,
				srcFormat,
				srcType,
				image
			);

			// Set the filtering so we don't need mips and it's not filtered.
			gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
			gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
			gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
			gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
			
		};

		image.src = url;

		return texture;

	}

	function updateTexture( gl, texture ) {

		gl.bindTexture( gl.TEXTURE_2D, texture.glTexture );
		gl.texImage2D(
			gl.TEXTURE_2D,
			texture.params.level,
			texture.params.internalFormat,
			texture.params.width,
			texture.params.height,
			texture.params.border,
			texture.params.srcFormat,
			texture.params.srcType,
			texture.pixels
		);

	}

	// Initilize textures for glyph, foreground color, and background color.
	let _textures = {
		glyph: initTexture( _gl, _numCharsX, _numCharsY, false ),
		foreground: initTexture( _gl, _numCharsX, _numCharsY ),
		background: initTexture( _gl, _numCharsX, _numCharsY )
	};

	let _fontTexture = loadTexture( _gl, _fontUrl );

	function drawScene( gl, programInfo, buffers, textures ) {

		// Clear to black, fully opaque.
		gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
		gl.clear( _gl.COLOR_BUFFER_BIT );

		// Tell WebGL to use our program when drawing.
		gl.useProgram( programInfo.program );

		// Tell WebGL how to pull out the positions from the position buffer into the vertexPositionNDC attribute.
		{
			const numComponents = 2;  // Pull out 2 values per iteration.
			const type = gl.FLOAT;    // The data in the buffer is 32bit floats.
			const normalize = false;  // Don't normalize.
			const stride = 0;         // How many bytes to get from one set of values to the next, 0 = use type and numComponents above.
			const offset = 0;         // How many bytes inside the buffer to start from.

			gl.vertexAttribPointer(
				programInfo.attribLocations.vertexPositionNDC,
				numComponents,
				type,
				normalize,
				stride,
				offset
			);
			gl.enableVertexAttribArray( programInfo.attribLocations.vertexPositionNDC );
		}

		gl.uniform2f( programInfo.uniformLocations.numChars, _numCharsX, _numCharsY );

		// Bind font texture to texture unit 0.
		gl.activeTexture( gl.TEXTURE0 );
		gl.bindTexture( gl.TEXTURE_2D, _fontTexture );
		gl.uniform1i( programInfo.uniformLocations.glyphTexture, 0 );

		// Bind glyph texture to texture unit 1.
		gl.activeTexture( gl.TEXTURE1 );
		gl.bindTexture( gl.TEXTURE_2D, textures.glyph.glTexture );
		gl.uniform1i( programInfo.uniformLocations.glyphTexture, 1 );

		// Bind foreground color to texture unit 2.
		gl.activeTexture( gl.TEXTURE2 );
		gl.bindTexture( gl.TEXTURE_2D, textures.foreground.glTexture );
		gl.uniform1i( programInfo.uniformLocations.foregroundColor, 2 );

		// Bind background color to texture unit 3.
		gl.activeTexture( gl.TEXTURE3 );
		gl.bindTexture( gl.TEXTURE_2D, textures.background.glTexture );
		gl.uniform1i( programInfo.uniformLocations.backgroundColor, 3 );

		{

			const offset = 0;
			const vertexCount = 6;
			gl.drawArrays( gl.TRIANGLES, offset, vertexCount );

		}

	}

	function update() {

		// Update textures using latest values in pixel arrays.
		updateTexture( _gl, _textures.glyph );
		updateTexture( _gl, _textures.foreground );
		updateTexture( _gl, _textures.background );

		drawScene( _gl, _programInfo, _buffers, _textures );
		
		window.requestAnimationFrame(update);

	}

	update();

	//
	// API
	//

	this.drawChar = function( x, y, glyph, foregroundColor, backgroundColor ) {

		// Do not attempt to set invalid positions.
		if ( x < 0 || x >= _numCharsX ) return;
		if ( y < 0 || y >= _numCharsY ) return;

		var index = y * _numCharsX + x;

		if (glyph !== undefined) {
			// Do not attempt to set invalid glyphs.
			if ( glyph < 0 || glyph > 255 ) return;

			// Set glyph at [x, y] to char.
			_textures.glyph.pixels[index] = glyph;
		}

		if (foregroundColor !== undefined) {
			// Set foreground pixels at [x, y] to foregroundColor.
			_textures.foreground.pixels[index * 3] = foregroundColor.r;
			_textures.foreground.pixels[index * 3 + 1] = foregroundColor.g;
			_textures.foreground.pixels[index * 3 + 2] = foregroundColor.b;
		}

		if (backgroundColor !== undefined) {
			// Set background pixels at [x, y] to backgroundColor.
			_textures.background.pixels[index * 3] = backgroundColor.r;
			_textures.background.pixels[index * 3 + 1] = backgroundColor.g;
			_textures.background.pixels[index * 3 + 2] = backgroundColor.b;
		}

	}

	this.drawString = function( x, y, text, foregroundColor, backgroundColor ) {

		var characters = text.split('');
		for (var i = 0; i < characters.length; i++) {
			_this.drawChar( x + i, y, characters[i].charCodeAt(0), foregroundColor, backgroundColor )
		}

	}

}

export { Terminal };
