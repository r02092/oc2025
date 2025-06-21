const path = require("path");
const Dotenv = require("dotenv-webpack");
module.exports = {
	entry: "./src/main.ts",
	output: {
		path: path.join(__dirname, "dist")
	},
	resolve: {
		extensions: [".js", ".ts"]
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				loader: "ts-loader"
			}
		]
	},
	plugins: [
		new Dotenv()
	],
	watchOptions: {
		ignored: /node_modules/
	}
};