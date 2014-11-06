// Copyright (c) 2014 Thibaut Vial. All rights reserved.

// Write debugging output
var InstaChromeDebug = true;

// Weak re-entrancy protection flag
var applying_camans = false;

// Keep track of what ids we have generated for images
var generated_index = 0;

// Cached value for filters
var filters = {};
RefreshFilters();

// Tracing function to output messages to the console
function trace(message)
{
	if (InstaChromeDebug)
	{
		console.log("InstaChrome: " + message);
	}
}

// Applies a CamanJS filter to the image with id passed as argument.
// CamanJS takes care of waiting for the image to be loaded.
function ApplyFilter(id)
{
	Caman(
		"#" + id,
		function ()
		{
			for (var filter in filters)
			{
				if (filters.hasOwnProperty(filter))
				{
					switch (filter)
					{
						case "brightness":
							this.brightness(filters[filter]); // strength (-100 - 100)
							break;
						case "channels":
							this.channels(filters[filter]); // channels { red: R, green: G, blue: B } (-100 - 100)
							break;
						case "clip":
							this.clip(filters[filter]); // threshold (0 - 100)
							break;
						case "colorize":
							this.colorize(filters[filter][0], filters[filter][1]); // RGB (#ABCDEF), strength (0 - 100)
							break;
						case "contrast":
							this.contrast(filters[filter]); // strength (-100 - 100)
							break;
						// case "curves":
						// 	this.curves(filters[filter]);
						// 	break;
						case "exposure":
							this.exposure(filters[filter]); // strength (-100 - 100)
							break;
						case "fillColor":
							this.fillColor(filters[filter]); // RGB (#ABCDEF)
							break;
						case "gamma":
							this.gamma(filters[filter]); // strength (0 - infinity)
							break;
						case "greyscale":
							this.greyscale();
							break;
						case "hue":
							this.hue(filters[filter]); // strength (0 - 100)
							break;
						case "invert":
							this.invert();
							break;
						case "noise":
							this.noise(filters[filter]); // strength (0 - infinity)
							break;
						case "saturation":
							this.saturation(filters[filter]); // strength (-100 - 100)
							break;
						case "sepia":
							this.sepia(filters[filter]); // strength (0 - 100)
							break;
						case "vibrance":
							this.vibrance(filters[filter]); // strength (-100 - 100)
							break;
					}
				}
			}

			this.render();
		});
}

// Make an XHR to download the image so we can workaround the CORS requirements
function DownloadImage(src, onload)
{			
	var xhr = new XMLHttpRequest();
	
	xhr.open('GET', src, true);
	xhr.responseType = "blob";
	
	xhr.onerror = function(e)
	{
		trace("Failed to download image for " + src + ".");
	};
	
	xhr.onload = function(e)
	{
		onload(e);
	}

	// Send the request
	trace("Downloading " + src + "...");
	xhr.send();
}

// This function is the meat of the extension, it trawls through the document looking for
// new img tags and applies caman filters to them.
function ApplyFilters()
{
	// Weak re-entrancy protection
	if (applying_camans)
	{
		return;
	}
	applying_camans = true;

	trace("Applying filters: " + filters);

	$("img[data-caman-applied!='true'], canvas[data-caman-applied='false']").each(
		function(index)
		{
			var id = $(this).attr("id");
			var src = $(this).attr("src");
			var name = this.localName.toLowerCase();
			
			// Mark image as having been handled
			$(this).attr("data-caman-applied", "true");

			switch (name)
			{
				case "img":
					// Unprocessed image
					if (src != null)
					{
						var uri = URI(src);

						if (uri.is("relative"))
						{
							srcAbsolute = uri.absoluteTo(window.location.href).href();
							trace(src + " is relative, changing to absolute (" + srcAbsolute + ")");
							src = srcAbsolute;
						}
						else if (uri.protocol() == "")
						{
							srcWithProtocol = uri.protocol(window.location.protocol).href();
							trace(src + " has no protocol, changing to same as parent (" + srcWithProtocol + ")");
							src = srcWithProtocol;
						}

						if (src.substr(0, 4) == "http")
						{
							// If the image element doesn't have an id yet, add one
							if (id == null)
							{
								id = "img_" + generated_index;
								generated_index++;
								$(this).attr("id", id);
								trace("Adding id: " + id + " for " + src);
							}

							// Make an XHR to download the image so we can workaround the CORS requirements
							DownloadImage(src, function(e)
							{
								// Get a local blob URL for the downloaded object
								var url = window.URL.createObjectURL(e.target.response);
								trace("Downloaded image for " + id + ": " + url);
								
								// Add a handler for when the image has (re)loaded as a local blob to apply the CamanJS filter
								$("#" + id).load(
								 	function()
								 	{
								 		trace("" + id + " has loaded, applying caman");
								 		ApplyFilter(id);
								 	});
									
								// Set the image source to the blob URL - this will cause the image to reload and go into the handler above
								$("#"+ id).attr("src",  url);
								
							});
						}
						else
						{
							trace(src + " is not an http link, skipping.");
						}
					}
					break;

				case "canvas":
					// Just need to reapply filter
					ApplyFilter(id);
					break;
			}
		});
	
	applying_camans = false;
}

// Put a handler to detect tree changes. This allows us to catch new elements appearing
// after the initial page load, for example FB's dyanmic timeline loader.
$(document.documentElement).bind("DOMSubtreeModified", function()
{
    ApplyFilters();
    // RefreshFilters();
});

// This causes all images & canvases to be marked as needing to have their caman filters applied again
function ResetAllImages()
{
	$("*[data-caman-applied='true']").attr("data-caman-applied", "false");
}

// Listener for messages from the popup window that tells us what Caman filters to apply
chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse)
	{
		switch (request.command)
		{
			case "caman-filters-changed":
				trace("Filters have changed, refreshing...");
				if (request.filters)
				{
					filters = request.filters;
					ResetAllImages();
					ApplyFilters();
				}
				else
				{
					RefreshFilters();
				}
				break;
		}
 	});

// Get the filters to be applied - requests this list from the popup which keeps track of the user's selection.
function RefreshFilters()
{
	chrome.runtime.sendMessage(
		{
			command: "get-caman-filters"
		},
		function(response)
		{
			if (response)
			{
  				filters = response.filters;
  				ResetAllImages();
				ApplyFilters();
  			}
		});
}

