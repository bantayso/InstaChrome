// Copyright (c) 2014 Thibaut Vial. All rights reserved.

// Write debugging output
var InstaChromeDebug = true;

// Weak re-entrancy protection flag
var applying_camans = false;

// Tracks whether we've queued applying filters due to DOM changes
var apply_filters_queued = false;

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
			// Reset to original first
			this.reloadCanvasData();

			// Resize to match target
			var newWidth = this.image.getAttribute("data-instachrome-width");
			var newHeight = this.image.getAttribute("data-instachrome-height");
			this.resize(
				{
					width: newWidth,
					height: newHeight
				});
			trace("Resizing " + id + " to " + newWidth + "x" + newHeight);

			// Apply filters
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
						case "curves":
							this.curves(filters[filter][0], filters[filter][1], filters[filter][2], filters[filter][3], filters[filter][4]); // "rgb", [tuple], [tuple], [tuple], [tuple] 
						 	break;
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

// JQuery can't work with id's that contain CSS markers. Escape the markers and return the escaped id.
function EscapeId(id)
{
  id = id.replace(":", "\\\\:");
  id = id.replace(".", "\\\\.");
  return id;
}

// This function is the meat of the extension, it trawls through the document looking for
// new img tags and applies caman filters to them.
function ApplyFilters()
{
	// Weak re-entrancy protection
	if (applying_camans)
	{
		trace("Re-entrancy!");
		return;
	}
	applying_camans = true;

	trace("Applying filters...");

	$("img[data-instachrome-processed!='true'], canvas[data-instachrome-processed='false']").each(
		function(index)
		{
			var id = $(this).attr("id");
			var name = this.localName.toLowerCase();
			
			// Mark image as having been handled
			$(this).attr("data-instachrome-processed", "true");

			switch (name)
			{
				case "img":
					var src = $(this).attr("src");

					// Unprocessed image
					if (src != null)
					{
						// Show original source in debug
						if (InstaChromeDebug)
						{
							$(this).attr("data-instachrome-src", src);

						}

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
							else
							{
								id = EscapeId(id);
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
										// Save width and height
										$(this).attr("data-instachrome-width", $(this).width());
										$(this).attr("data-instachrome-height", $(this).height());

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
// after the initial page load, for example FB's dynamic timeline loader.
$(document.documentElement).bind("DOMSubtreeModified", function()
{
	if (!apply_filters_queued)
	{
		apply_filters_queued = true;
		setTimeout(
			function()
			{
				ApplyFilters();
				apply_filters_queued = false;
			},
			250);
	}
 });

// This causes all images & canvases to be marked as needing to have their caman filters applied again
function ResetAllImages()
{
	$("*[data-instachrome-processed='true']").attr("data-instachrome-processed", "false");
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

