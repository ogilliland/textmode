function createCanvasElement() {

	const canvas = document.createElement('canvas');
	canvas.style.display = 'block';
	return canvas;

}

function Terminal( parameters = {} ) {

	const _canvas = parameters.canvas !== undefined ? parameters.canvas : createCanvasElement(),
		_context = parameters.context !== undefined ? parameters.context : null;

	let _width = _canvas.width;
	let _height = _canvas.height;

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
