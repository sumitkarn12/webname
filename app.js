
var faq = null;
var content = null;

Parse.initialize( "1e3bc14f-0975-4cb6-9872-bff78542f22b" );
Parse.serverURL = "https://parse.buddy.com/parse";

var opts = {
	lines: 13, // The number of lines to draw
	length: 38, // The length of each line
	width: 10, // The line thickness
	radius: 45, // The radius of the inner circle
	position: 'absolute' // Element positioning
};
const spin = new Spinner( opts ).spin();
$("#my-spinner").html( spin.el );

$(".faq").on("click", ()=>{
	faq.render();
})

const Content = Backbone.View.extend({
	el: "#content",
	initialize: function() {
		var self = this;
		this.username = location.pathname.substring( 1 );
		this.cardTemplate = _.template(this.$el.find("#link-card-template").html());
		console.log( "Searching", this.username, this.username.length );
		if( this.username.length != 0 ) {
			$("#my-spinner").show();
			this.searchProfile( this.username ).then(r => {
				self.user = r;
				$("#my-spinner").hide();
				this.prepareInfo( self.user.get("profile") ).then(async function() {
					await self.populateFavBtns( r.get("favbtns") );
					await self.populateLinkCard( r.get("links") );
				});
			}).catch(err=>{
				$.sticky("User not found");
				$(".page").hide();
				$("#main").show();
			});
		} else {
			$(".page").hide();
			$("#main").show();
		}
		return this;
	},
	render: function() {
		let self = this;
		$( ".page" ).hide();
		if( this.username.length != 0 ) {
			this.$el.show();
		} else {
			$("#main").show();
		}
		return this;
	},
	searchProfile: function( username ) {
		return new Promise((resolve, reject)=>{
			let q = new Parse.Query( Parse.User );
			q.equalTo( "username", username.toLowerCase() );
			setTimeout(()=>{
				q.first().then( resolve, reject );
			}, 3000);
		});
	},
	events: {
		"click .link-card": "openLink"
	},
	prepareInfo: function( data ) {
		var self = this;
		return new Promise( resolve =>{
			let cover = self.lazyLoad( data.cover, ()=>{
				console.log( self.$el.find(".cover").height() );
				if (self.$el.find(".cover").height()<300) {
					self.$el.find(".picture-card").height( self.$el.find(".cover").height() );
				} else {
					self.$el.find(".picture-card").height( 300 );
				}
				setTimeout( resolve, 1000 );
			});
			cover.classList.add( "w3-image" );
			self.$el.find(".section .cover").html( cover );
			let dp = this.lazyLoad( data.picture );
			dp.classList.add("w3-image","w3-card-4","w3-circle", "w3-border", "w3-theme", "profile-picture");
			self.$el.find(".section .dp").html( dp );
			self.$el.find(".section .info-card .display-name").text( data.name );
			self.$el.find(".section .info-card .bio").text( data.about );

			// Update info-card-modal fields as well
			self.$el.find("#info-card-modal .cover_photo_url").val( data.cover );
			self.$el.find("#info-card-modal .profile_photo_url").val( data.picture );
			self.$el.find("#info-card-modal .display_name").val( data.name );
			self.$el.find("#info-card-modal .about").val( data.about );

			cover.setAttribute( "src", cover.getAttribute("data-src") );
			dp.setAttribute( "src", dp.getAttribute("data-src") );
		});
	},
	lazyLoad: function( src, callback ) {
		let im = new Image();
		im.setAttribute( "data-src", src );
		im.onload = ( ev )=>{
			im.removeAttribute( "data-src" );
			if( callback )
				callback( ev );
		};
		return im;
	},
	populateFavBtns: async function( data ) {
		var self = this;
		for( const btn of data ) {
			await self.renderFavBtn( btn );
		}
	},
	renderFavBtn: function( data ) {
		var self = this;
		return new Promise((res)=>{
			let btn = self.$el.find('.fav-btns').find(`[data-type=${data.type}]`);
			btn.show();
			btn.attr( "href", self.createUrl( data ) );
			setTimeout( res, 10 );
		});
	},
	createUrl: function( res ) {
		switch( res.type ) {
			case "facebook": return `https://fb.me/${res.uid}`;
			case "twitter": return `https://twitter.com/${res.uid}`;
			case "instagram": return `https://instagr.am/_u/${res.uid}`;
			case "whatsapp": return `https://api.whatsapp.com/send?phone=${res.uid}&text=hey`;
			case "youtube": return `https://www.youtube.com/${res.uid}`;
		}
		return "";
	},
	populateLinkCard: async function( data ) {
		var self = this;
		for( const card of data ) {
			await self.renderLinkCard( card );
		}
	},
	renderLinkCard: function( data ) {
		var self = this;
		return new Promise((res)=>{
			let el = $( self.cardTemplate( data ) );
			el.find("img").on("load", (ev)=>{
				ev.target.removeAttribute("data-src");
				let img = $(ev.target);
				img.parent().height( img.width() );
			});
			self.$el.find('.link-cards').append( el );
			setTimeout( res, 50);
		});
	},
	openLink: function( ev ) {
		ev.preventDefault();
		let card = $( ev.currentTarget );
		window.open(card.data("url"), "_blank")
	}
});
const FAQ = Backbone.View.extend({
	el: "#faq",
	initialize: function() {
		return this;
	},
	events: {
		"click .back" : "back"
	},
	back: function( ev ) {
		ev.preventDefault();
		if( content == null ) content = new Content();
		content.render();
	},
	render: function() {
		$( ".page" ).hide();
		this.$el.show();
		return this;
	}
});
faq = new FAQ();

let path = location.pathname.substring( 1 );
console.log( "PATH", path );
if( path != "" ) {
	console.log( path );
	content = new Content();
	content.render();
} else {
	$("#my-spinner").hide();
	$("#main").show();
}

$( window ).on('resize', function(event) {
	event.preventDefault();
	$(".page").css("margin-bottom", $(".w3-bottom").height())
});
$(".page").css("margin-bottom", $(".w3-bottom").height());

let recentU = new Parse.Query( Parse.User );
recentU.descending( "updatedAt" );
recentU.first().then(u=>{
	$(".explore").attr("href", `https://webname.ga/${u.get("username")}`);
	$(".explore").show();
});
