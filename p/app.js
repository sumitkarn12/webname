
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
// $("#my-spinner").html( spin.el );

const Model = Backbone.Model.extend();
let model = new Model();
const Profile = Backbone.View.extend({
	el: "#profile",
	initialize: function() {
		model.on("change:profile", ( m,v ) => this.renderProfile( v ) );
		model.on("change:image", (m,v)=>this.renderDP( v ) );
	},
	renderDP: function( image ) {
		this.$el.find(".cover").css( "background-image", `url(${image})` );
		this.$el.find(".dp").attr( "src", image );
	},
	renderProfile: function( profile ) {
		this.$el.find(".name").html( profile.name );
		this.$el.find(".about").html( profile.about );
		if( profile.mobile ) {
			this.$el.find(".call").attr( `tel:${profile.mobile}` );
			this.$el.find(".call").show();
		}
		if( profile.email ) {
			this.$el.find(".email").attr( `mailto:${profile.email}` );
			this.$el.find(".email").show();
		}
	}
});
const Quickie = Backbone.View.extend({
	el: "#quickie",
	initialize: function() {	
		model.on("change:favbtns", (m,v)=> this.render( v ) )
		this.template = _.template( this.$el.find("#template").html() );
	},
	render: function( links ) {
		let self = this;
		this.$el.find(".btns").empty();
		links.forEach(( e )=>{
			e = $.extend({ url: self.toUrl( e ) }, e);
			self.$el.find(".btns").append( self.template( e ) );
		});
	},
	toUrl: function( o ) {
		switch( o.type ) {
			case "facebook" : return `https://www.facebook.com/${o.uid}`;
			case "twitter" : return `https://www.twitter.com/${o.uid}`;
			case "instagram" : return `https://www.instagram.com/_u/${o.uid}`;
			case "messenger" : return `https://m.me/${o.uid}`;
			case "youtube" : return `https://www.youtube.com/${o.uid}`;
			case "googleplus" : return `https://plus.google.com/${o.uid}`;
			case "linkedin" : return `https://www.linkedin.com/${o.uid}`;
			case "github" : return `https://www.github.com/${o.uid}`;
			case "whatsapp" : return `https://api.whatsapp.com/send?phone=${o.uid}&text=${encodeURIComponent("Sending hi from "+location.href)}`;
			default: return o.uid;
		}
	}
});
const Bookmark = Backbone.View.extend({
	el: "#bookmark",
	initialize: function() {	
		model.on("change:bookmarks", (m,v)=> this.render( v ) )
		this.template = _.template( this.$el.find("#template").html() );
	},
	render: function( links ) {
		let self = this;
		this.$el.find(".links").empty();
		links.forEach(( e )=>{
			try {
				let tmpl = $(self.template( e ));
				self.$el.find(".links").append( tmpl );
				tmpl.find(".faded-background").height( tmpl.find(".w3-card").width() );
			} catch ( e ) {
				console.log( e );
			}
		});
	}
});
const Mdl = Backbone.View.extend({
	el: "#mdl",
	render: function( o ) {
		if( o.header ) {
			this.$el.find(".header").html( o.header );
			this.$el.find(".header").show();
		} else {
			this.$el.find(".header").hide();
		}
		if( o.body ) {
			this.$el.find(".body").html( o.body );
			this.$el.find(".body").show();
		} else {
			this.$el.find(".body").hide();
		}
		this.$el.show();
		if (o.timeout && $.isNumeric(o.timeout)) {
			this.tym = setTimeout( ()=> this.hide(), o.timeout );
		} else {
			this.tym = setTimeout( ()=> this.hide(), 5000 );
		}
	},
	hide: function() {
		clearTimeout( this.tym );
		this.$el.hide();
	}
});

let profile = new Profile();
let quickie = new Quickie();
let bookmark = new Bookmark();
var mdl = new Mdl();

mdl.render({header: "Painting canvas", timeout: 10*60*1000});
let q = new Parse.Query( Parse.User );
q.equalTo( "username", "sumit" );
q.first().then(( u )=>{
	model.set( "image", u.get( "image" ) );
	model.set( "profile", u.get( "profile" ) );
	model.set( "favbtns", u.get( "favbtns" ) );
	model.set( "bookmarks", u.get( "links" ) );
	mdl.hide();
});

let path = location.pathname.substring( 1 );

$( window ).on('resize', function(event) {
	event.preventDefault();
	let w = bookmark.$el.find(".link .w3-card").first().width();
	bookmark.$el.find(".link .faded-background").height( w );
});
