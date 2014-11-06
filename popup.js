// Resets the selection
function ResetSelection()
{
	$(".PresetButton").attr("id", "");
}

// Installs a click handler for the preset buttons
$(".PresetButton").click(
	function()
	{
		ResetSelection();
		$(this).attr("id", "Selected");

		var filters = {};
		switch ($(this).attr("preset-id"))
		{
			case "ItsWarBaby":
				filters =
				{
					"greyscale": true
				};
				break;

				case "LaVieEnRose":
				filters = 
				{
					"sepia": 80
				};
				break;
		}

		// Tell the background page what filters to apply
		chrome.runtime.sendMessage(
			{
				command: "set-caman-filters",
				filters: filters
			});
	});
