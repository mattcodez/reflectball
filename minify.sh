#! /bin/bash
java -Xmx50m -jar ~/closure/compiler.jar \
	--js \
		client.js \
		player.js \
		ball.js \
		events.js \
	--js_output_file \
		client.min.js

java -Xmx50m -jar ~/closure/compiler.jar \
	--js js/fabric.js \
	--js_output_file js/fabric.min.js
