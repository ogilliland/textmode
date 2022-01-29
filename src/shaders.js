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
		vTexCoords.y = 1.0 - vTexCoords.y; // Invert y so [0, 0] is at the top left.
		gl_Position = vec4(vertexPositionNDC, 0.0, 1.0);
	}
`;

// Convert pixels to textmode characters. Glyph is drawn using foregroundColor and empty space using backgroundColor.
const fragmentSource = `
	precision mediump float;

	const float numColumns = 16.0;

	varying vec2 vTexCoords;

	uniform vec2 numChars; // Number of pixels present in glyph, foreground, and background textures
	uniform sampler2D fontTexture;
	uniform sampler2D glyphTexture;
	uniform sampler2D foregroundColor;
	uniform sampler2D backgroundColor;

	void main()
	{
		vec2 charSize = vec2(1.0/numChars.x, 1.0/numChars.y); // Size of 1 character as fraction of UV space.
		vec2 uvMod = mod(vTexCoords, charSize);
		vec2 uv = vTexCoords - uvMod + 0.5 * charSize;
		float glyph = texture2D(glyphTexture, uv).r;
		vec3 fg = texture2D(foregroundColor, uv).rgb;
		vec3 bg = texture2D(backgroundColor, uv).rgb;

		float fontRow = floor(glyph * 256.0 / numColumns);
		float fontColumn = floor(mod(glyph * 256.0, numColumns));

		vec2 fontMod = vec2(uvMod.x * numChars.x, uvMod.y * numChars.y) / numColumns;
		vec2 fontUV = vec2(fontColumn / numColumns, fontRow / numColumns) + fontMod;
		
		float fontValue = texture2D(fontTexture, fontUV).r;
		
		gl_FragColor = vec4(fg * fontValue + bg * (1.0 - fontValue), 1);
	}
`;

export { vertexSource, fragmentSource };
