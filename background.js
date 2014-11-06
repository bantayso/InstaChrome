// List of Caman filters to be applied - initially none
var caman_filters = {};

// This function gets called when the filters have been changed and handles notifying the content script(s)
function onFiltersChanged()
{
	chrome.tabs.query(
		{
			active: true,
			currentWindow: true
		},
		function(tabs)
		{
			chrome.tabs.sendMessage(
				tabs[0].id,
				{
					command: "caman-filters-changed",
					filters: caman_filters
				},
				function(response)
				{
    				// Don't really care about responses
  				});
		});
}

// Listens to requests from the content script and popup pages for setting and getting the filters to apply
chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse)
	{
		switch (request.command)
		{
			case "get-caman-filters":
				sendResponse(
					{
						filters: caman_filters
					});
				break;

			case "set-caman-filters":
				caman_filters = request.filters;
				onFiltersChanged();
				break;
		}
  });
