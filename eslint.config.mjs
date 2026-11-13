export default [
	{
		ignores: ["**/node_modules"],
	},
	{
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
		},
		rules: {
			"no-unreachable": "error",
			"no-unused-vars": "error",
		},
	},
];
