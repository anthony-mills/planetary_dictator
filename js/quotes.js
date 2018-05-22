var spaceQuotes = [
	{
		quote: "Who are we? We find that we live on an insignificant planet of a humdrum star lost in a galaxy tucked away in some forgotten corner of a universe in which there are far more galaxies than people.",
		attribution: "Carl Sagan"
	},
	{
		quote: "We are just an advanced breed of monkeys on a minor planet of a very average star. But we can understand the Universe. That makes us something very special.",
		attribution: "Stephen Hawking"
	},
	{
		quote: "Space exploration is a force of nature unto itself that no other force in society can rival.",
		attribution: "Neil deGrasse Tyson"
	},
	{
		quote: "When you&#39;re getting ready to launch into space, you&#39;re sitting on a big explosion waiting to happen.",
		attribution: "Sally Ride"
	},	
	{
		quote: "I would like to die on Mars. Just not on impact.",
		attribution: "Elon Musk"
	},
	{
		quote: "Pilots take no special joy in walking. Pilots like flying.",
		attribution: "Neil Armstrong"
	},
	{
		quote: "That&#39;s one small step for a man, one giant leap for mankind.",
		attribution: "Neil Armstrong"
	},
	{
		quote: "The Universe is under no obligation to make sense to you.",
		attribution: "Neil deGrasse Tyson"
	},
	{
		quote: "The desire to fly is an idea handed down to us by our ancestors who... looked enviously on the birds soaring freely through space... on the infinite highway of the air.",
		attribution: "Wilbur Wright"
	},	
	{
		quote: "There are no passengers on spaceship earth. We are all crew.",
		attribution: "Marshall McLuhan"
	},
	{
		quote: "We are the representatives of the cosmos; we are an example of what hydrogen atoms can do, given 15 billion years of cosmic evolution.",
		attribution: "Carl Sagan"
	},
	{
		quote: "The dinosaurs became extinct because they didn&#39;t have a space program..",
		attribution: "larry Niven"
	},
	{
		quote: "We can allow satellites, planets, suns, universe, nay whole systems of universes, to be governed by laws, but the smallest insect, we wish to be created at once by special act.",
		attribution: "Charles Darwin"
	},
	{
		quote: "The sun, with all those planets revolving around it and dependent on it, can still ripen a bunch of grapes as if it had nothing else in the universe to do.",
		attribution: "Galileo Galilei"
	},	
	{
		quote: "A time will come when men will stretch out their eyes. They should see planets like our Earth.",
		attribution: "Christopher Wren"
	}													
]

var getQuote = function() {
	var spaceQuote = spaceQuotes[Math.floor(Math.random()*spaceQuotes.length)];

	var quoteHtml = '<blockquote class="boot-quote">' +
					'<p>' + spaceQuote.quote + '</p>' +
					'<span class="quote-attribution"> - ' + spaceQuote.attribution + '</span></p>' +					
					'</blockquote>';

	jQuery("#space-quote").html(quoteHtml);
}