function createCanvasElement() {

	const canvas = document.createElement( 'canvas' );
	canvas.style.display = 'block';
	return canvas;

}

function Terminal( parameters = {} ) {

	const _canvas = parameters.canvas !== undefined ? parameters.canvas : createCanvasElement(),
		_context = parameters.context !== undefined ? parameters.context : null;

	let _width = _canvas.width;
	let _height = _canvas.height;

	// Public properties

	this.domElement = _canvas;

	// Initialize

	let _gl = _context;

	try {

		if ( _gl === null ) {

			_gl = _canvas.getContext( 'webgl' );

			if ( _gl === null ) {

				throw new Error( 'Unable to initialize WebGL. Your browser or machine may not support it.' );

			}

		}

	} catch ( error ) {

		console.error( 'TEXTMODE.Terminal: ' + error.message );
		throw error;

	}

	function initGLContext() {

		// Set clear color to opaque black
		_gl.clearColor(0.0, 0.0, 0.0, 1.0);

		// Clear the color buffer with specified clear color
		_gl.clear(_gl.COLOR_BUFFER_BIT);

	}

	initGLContext();

	// API

	this.getSize = function() {

		return {
			'width': _width,
			'height': _height
		};

	};

	this.setSize = function( width, height, updateStyle ) {

		_width = width;
		_height = height;

		_canvas.width = width;
		_canvas.height = height;

		if (updateStyle !== false) {

			_canvas.style.width = width + 'px';
			_canvas.style.height = height + 'px';

		}

	};

}

export { Terminal };
