
var auth = null;
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

const Content = Backbone.View.extend({
	el: "#content",
	initialize: function() {
		$("#my-spinner").show();
		var self = this;
		this.username = location.pathname.substring( 1 );
		this.cardTemplate = _.template(this.$el.find("#link-card-template").html());
		this.searchProfile( this.username ).then(r => {
			self.user = r;
			$("#my-spinner").fadeOut( "slow" );
			this.prepareInfo( self.user.get("profile") ).then(async function() {
				await self.populateFavBtns( r.get("favbtns") );
				await self.populateLinkCard( r.get("links") );
			});
		}).catch(err=>{
			$.sticky("User not found");
			$(".page").hide();
			$("#main").show();
		});
		return this;
	},
	render: function() {
		let self = this;
		$( ".page" ).hide();
		this.$el.show();
		return this;
	},
	searchProfile: function( username ) {
		return new Promise((resolve, reject)=>{
			let q = new Parse.Query( Parse.User );
			q.equalTo( "username", username );
			q.first().then( resolve, reject );
		});
	},
	events: {
		"click .link-card": "openLink"
	},
	prepareInfo: function( data ) {
		var self = this;
		return new Promise( resolve =>{
			let cover = self.lazyLoad( data.cover, ()=>{
				self.$el.find(".picture-card").height( self.$el.find(".cover").height() );
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
			setTimeout( res, 500 );
		});
	},
	createUrl: function( res ) {
		switch( res.type ) {
			case "facebook": return `https://fb.me/${res.uid}`;
			case "twitter": return `https://twitter.com/${res.uid}`;
			case "instagram": return `https://instagr.am/_u/${res.uid}`;
			case "whatsapp": return `https://api.whatsapp.com/send?phone=${res.uid}`;
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
			el.find("img").on("load", (ev)=> ev.target.removeAttribute("data-src") );
			self.$el.find('.link-cards').append( el );
			setTimeout( res, 500);
		});
	},
	openLink: function( ev ) {
		ev.preventDefault();
		let card = $( ev.currentTarget );
		window.open(card.data("url"), "_blank")
	}
});

let path = location.pathname.substring( 1 );
if( path != "" ) {
	console.log( path );
	content = new Content();
	content.render();
}

$( window ).on('resize', function(event) {
	event.preventDefault();
	$(".page").css("margin-bottom", $(".w3-bottom").height())
});
$(".page").css("margin-bottom", $(".w3-bottom").height())