import babel from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';

let build = [
	{
		input: 'src/main.js',
		plugins: [
			babel( {
				babelHelpers: 'bundled',
				compact: false
			} )
		],
		output: [
			{
				file: 'build/textmode.js',
				name: "TEXTMODE",
				format: 'umd'
			}
		]
	},
	{
		input: 'src/main.js',
		plugins: [
			babel( {
				babelHelpers: 'bundled',
				compact: true
			} ),
			terser()
		],
		output: [
			{
				file: 'build/textmode.min.js',
				name: "TEXTMODE",
				format: 'umd'
			}
		]
	}
];

export default build;
