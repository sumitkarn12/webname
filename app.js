
Parse.initialize( "1e3bc14f-0975-4cb6-9872-bff78542f22b" );
Parse.serverURL = "https://parse.buddy.com/parse";
var faq = null;

$(".faq").on("click", ()=> faq.render() )
const FAQ = Backbone.View.extend({
	el: "#faq",
	events: {
		"click .back" : "back"
	},
	back: function( ev ) {
		ev.preventDefault();
		$( ".page" ).hide();
		$( "#main" ).show();
	},
	render: function() {
		$( ".page" ).hide();
		this.$el.show();
		return this;
	}
});
faq = new FAQ();

let recentUTemplate = _.template( $("#recent-li").html() );
let recentU = new Parse.Query( Parse.User );
recentU.descending( "updatedAt" );
recentU.limit( 10 );
// recentU.find().each(u=>{
// 	$(".explore").attr("href", `https://webname.ga/${u.get("username")}`);
// 	$(".explore").show();
// });
recentU.find().then(r=>{
	r.forEach(e=>{
		$("#recent").append( recentUTemplate(e.toJSON()) );
		console.log( e.toJSON() );
	});
});

