import { vertexSource, fragmentSource } from './shaders.js';

function createCanvasElement() {

	const canvas = document.createElement( 'canvas' );
	canvas.style.display = 'block';
	return canvas;

}

function Terminal( parameters = {} ) {

	const _width = parameters.width !== undefined ? parameters.width : 320;
	const _height = parameters.height !== undefined ? parameters.height : 200;
	const _scale = parameters.scale !== undefined ? parameters.scale : 1;

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
	function initTexture( gl, width, height ) {

		const texture = gl.createTexture();
		gl.bindTexture( gl.TEXTURE_2D, texture );

		const level = 0;
		const internalFormat = gl.RGB;
		const border = 0;
		const srcFormat = gl.RGB;
		const srcType = gl.UNSIGNED_BYTE;
		const pixel = new Uint8Array( [255, 0, 0] );  // Opaque red.
		gl.texImage2D(
			gl.TEXTURE_2D,
			level,
			internalFormat,
			1, // width
			1, // height
			border,
			srcFormat,
			srcType,
			pixel
		);

		// set the filtering so we don't need mips and it's not filtered
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );

		return texture;

	}

	// Initilize textures for glyph, foreground color, and background color.
	// TO DO: make foreground color and background color gl.RGB (3 channels), and make glyph gl.LUMINANCE (1 channel).
	let _textures = {
		glyphTexture: initTexture( _gl, _width, _height ),
		foregroundColor: initTexture( _gl, _width, _height ),
		backgroundColor: initTexture( _gl, _width, _height )
	};

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

		// Bind glyph texture to texture unit 0.
		gl.activeTexture( gl.TEXTURE0 );
		gl.bindTexture( gl.TEXTURE_2D, textures.glyphTexture );
		gl.uniform1i( programInfo.uniformLocations.glyphTexture, 0 );

		// Bind foreground color to texture unit 1.
		gl.activeTexture( gl.TEXTURE1 );
		gl.bindTexture( gl.TEXTURE_2D, textures.foregroundColor );
		gl.uniform1i( programInfo.uniformLocations.foregroundColor, 1 );

		// Bind background color to texture unit 2.
		gl.activeTexture( gl.TEXTURE2 );
		gl.bindTexture( gl.TEXTURE_2D, textures.backgroundColor );
		gl.uniform1i( programInfo.uniformLocations.backgroundColor, 2 );

		{

			const offset = 0;
			const vertexCount = 6;
			gl.drawArrays( gl.TRIANGLES, offset, vertexCount );

		}

	}

	drawScene( _gl, _programInfo, _buffers, _textures );

}

export { Terminal };
