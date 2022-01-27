// Draw fullscreen quad.
const vertexSource = `
	precision lowp float;

	// Vertex position in normalized device coordinates [-1, +1] range.
	attribute vec2 vertexPositionNDC;

	varying vec2 vTexCoords;

	const vec2 scale = vec2(0.5, 0.5);

	void main()
	{
			vTexCoords  = vertexPositionNDC * scale + scale; // Scale vertex attribute to [0, 1] range.
			gl_Position = vec4(vertexPositionNDC, 0.0, 1.0);
	}
`;

// TO DO: Convert pixel grid to textmode characters.
const fragmentSource = `
	precision mediump float;

	varying vec2 vTexCoords;

	void main()
	{
			gl_FragColor = vec4(vTexCoords, 0, 1);
	}
`;

export { vertexSource, fragmentSource };
