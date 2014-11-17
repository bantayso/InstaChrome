// Resets the selection
function ResetSelection()
{
	$(".PresetButton").attr("id", "");
}

// Installs a click handler for the preset buttons
function InstallClickHandlers()
{
	console.log("InstallClickHandlers");

	$(".PresetButton").click(
		function()
		{
			ResetSelection();
			$(this).attr("id", "Selected");

			var filters = {};
			var preset_id = $(this).attr("preset-id");
			switch (preset_id)
			{
				// This is basically SinCity from the CamanJS examples
				case "ItsWarBaby":
					filters =
					{
						"contrast": 100,
						"brightness": 15,
						"exposure": 10,
						"posterize": 80,
						"clip": 30,
						"greyscale": true
					};
					break;

				// This is basically Love from the CamanJS examples
				case "LaVieEnRose":
					filters = 
					{
						"brightness": 5,
						"exposure": 8,
						"contrast": 4,
						"colorize":
						[
							"#c42007",
							30
						],
						"vibrance": 50,
						"gamma": 1.3
					};
					break;

				// This is basically Vintage from the CamanJS examples
				case "GrannysPictures":
					filters =
					{
						"greyscale": true,
						"contrast": 5,
						"noise": 3,
						"sepia": 100,
						"channels":
						{
							red: 8,
							blue: 2,
							green: 4
						},
						"gamma": 0.87
					};
					break;

				case "Daltonian":
					break;

				// This is basically Lomo from the CamanJS examples
				case "Instacrap":
					filters = 
					{
						"brightness": 15,
						"exposure": 15,
						"curves":
						[
							"rgb",
							[0, 0],
							[200, 0],
							[155, 255],
							[255, 255]
						],
						"saturation": -20,
						"gamma": 1.8
					};
					break;
			}

			// Tell the background page what filters to apply
			chrome.runtime.sendMessage(
				{
					command: "set-caman-filters",
					filters: filters,
					preset_id: preset_id
				});
		});
}

// Handler for when the document is ready, i.e. "onload". We use it to preselect the appropriate filter.
window.addEventListener(
	'DOMContentLoaded',
	function()
	{
		InstallClickHandlers();

		chrome.runtime.sendMessage(
		{
			command: "get-caman-filters"
		},
		function(response)
		{
			console.log("Got filters");
			if (response)
			{
  				var preset_id = response.preset_id;
  				$("*[preset-id='" + preset_id + "']").attr("id", "Selected");
  			}
		});

	});
