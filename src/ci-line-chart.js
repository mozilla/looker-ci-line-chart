const visualization = {
	create: function(element, config){
		element.innerHTML = "Test";
	},

	updateAsync: function(data, element, config, queryResponse, details, done){
		var html = "testtest";
		for(var row of data) {
			var cell = row[queryResponse.fields.dimensions[0].name];
			html += LookerCharts.Utils.htmlForCell(cell);
		}
		element.innerHTML = html;
		done()
	}
};

looker.plugins.visualizations.add(visualization);
