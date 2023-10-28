# PhotoPrismBulkEditor

It's almost just the title, because im not good at naming things.

## So what is it then?

It's a chrome plugin that allows you to bulk edit the metadata of images and videos in PhotoPrism.

## How did you get this great idea?

This feature is something a lot of people want (including me) and I'm also not the first with this idea.

To be more specific [Stephen Chew](https://github.com/stephenchew) had that idea a bit before me and published a gist [Bulk edit photos in Photoprism](https://gist.github.com/stephenchew/b73ecc75b77a84a92fa350048d5ca84f).
This project uses his code as its base.

## So what can it do?

Currently, you can edit the metadata for title, artist, keywords, lat, lng, day, month and year.
For the text inputs you can decide if you want to prepend, replace or append.

You then get a lot of checks, like:
- did you select more than one?
- did you open the editor? (might remove that one and just open it)
- are the images you selected properly selected (sometimes PhotoPrism has allowed me to go past the last selected element, very not good)

Btw. it will store your last input when you close the popup so don't be afraid to click out of it while getting everything setup,
but once the ball is rolling it needs to stay open or it stopps.
But you could also consider that the emergency stop.

## Great, how do I use this?

Currently, you can download the source code and got to [chrome://extensions/](), enable "Developer Mode"
and click un "Load unpacked" (for other languages, the button on the left) then select the folder with the manifest.json

Once I got the time I will pack it properly as a Chrome extension, 
and you can just get it from the store.

## Is there something I need to know?

Yea, as it stands now, only I have tested this tool and there might be unexpected bugs so keep an eye on it as it runs.

Another important thing is that when you enter lat, lng you use the correct format meaning `#.###` with `#,###` everything after the `,` will be ignored. (might add a extra check for that)

## Why is it dark themed?

I like it

## Would you add a light theme

NO

## But what about an option to add Labels?

Yea, im planing on adding that and an option to remove them too

I also what to support replacing stuff with regex and also (all) other fields.


### Any other questions?