import { vertexSource, fragmentSource } from './shaders.js';

function createCanvasElement() {

	const canvas = document.createElement( 'canvas' );
	canvas.style.display = 'block';
	return canvas;

}

function Terminal( parameters = {} ) {

	const _width = parameters.width !== undefined ? parameters.width : 320,
				_height = parameters.height !== undefined ? parameters.height : 200,
				_scale = parameters.scale !== undefined ? parameters.scale : 1

	const _canvas = createCanvasElement()
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
			position: positionBuffer,
		};
	}

	let _buffers = {
		position: initBuffers(_gl)
	}

	function drawScene( gl, programInfo, buffers ) {

		// Clear to black, fully opaque.
		gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
		gl.clear( _gl.COLOR_BUFFER_BIT );

		// Tell WebGL how to pull out the positions from the position buffer into the vertexPosition attribute.
		{

			const numComponents = 2;  // Pull out 2 values per iteration.
			const type = gl.FLOAT;    // The data in the buffer is 32bit floats.
			const normalize = false;  // Don't normalize.
			const stride = 0;         // How many bytes to get from one set of values to the next, 0 = use type and numComponents above.
			const offset = 0;         // How many bytes inside the buffer to start from.

			gl.vertexAttribPointer(
					programInfo.attribLocations.vertexPosition,
					numComponents,
					type,
					normalize,
					stride,
					offset
			);
			gl.enableVertexAttribArray( programInfo.attribLocations.vertexPositionNDC );

		}

		// Tell WebGL to use our program when drawing.
		gl.useProgram( programInfo.program );

		{

			const offset = 0;
			const vertexCount = 6;
			gl.drawArrays( gl.TRIANGLES, offset, vertexCount );

		}

	}

	drawScene( _gl, _programInfo, _buffers );

}

export { Terminal };
