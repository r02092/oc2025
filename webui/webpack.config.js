const path = require("path");
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
	watchOptions: {
		ignored: /node_modules/
	}
};