$(function() {
	$.get('/getData', function(datum) {
		if (datum == 'An error occurred') {
			$('<span></span>')
				.text('Error: ' + datum)
				.appendTo('p#deets')
		} else if (datum.type == 'views') {
			$('select').css('display', 'block')
			$('select').append('<option value=""> Select a view')
			datum.results.forEach(function(view) {
				$('select').append('<option value="' + view.id + '"> ' + view.name)
			})
		} else {
			$('<div></div>')
				.text('Stats:')
				.appendTo('p#deets')
			$('p#deets').append(
				'<h4>Views</h4><img src="//chart.googleapis.com/chart?chxp=0,0&chxl=0:|A month ago|Now|1:|0|' +
					datum[1] +
					'&chbh=17,1,0&chxt=x,y&cht=bvs&chs=600x125&chco=c0c0c0&chd=t:' +
					datum[0] +
					'&chds=0,' +
					datum[1] +
					'" />'
			)
		}
	})

	$('select').on('change', function(event) {
		var active = $('select').val()
		if (active != 'null') {
			$.get('/getData?' + $.param({ view: active }), function() {
				window.location.reload()
			})
		}
	})
})
