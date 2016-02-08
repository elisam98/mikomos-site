<?php
ini_set('display_errors', 'On');
ini_set('max_execution_time', -1);
ini_set('memory_limit', -1);
error_reporting(E_ALL | E_STRICT);
date_default_timezone_set('UTC');
// header('Content-type: application/json');

	$continue = "";
	$mikomos = [];
	$i = 0;

	do {
		$sourceURL = "http://www.mikomos.com/w/api.php?action=query&format=json&generator=allpages&prop=revisions&rvprop=content&gaplimit=max&gapcontinue=".$continue;
		$json = json_decode(file_get_contents($sourceURL), true);
//		print_r($json);

		if (@$json['query-continue']) {
			$continue = ($json['query-continue']['allpages']['gapcontinue']);
		}
		foreach($json['query']['pages'] as $key=>$page) {
			$content = $page['revisions'][0]['*'];
			$isMakom = strpos($content, '{{Makombox');
//			if($key === 2316) {
			if($isMakom !== false) {
				$mikomos[$i]['title'] = trim($page['title']);
				$mikomos[$i]['id'] = $page['pageid'];
				$mikomos[$i]['categories'] = [];

				$content = str_replace("{{Makombox All\n|", '', $content);
				$start = strpos($content, "\n}}");
				if($start) {
					$content = substr($content, 0, $start);
				}
				else {
					print_r($content."\n\n");
				}
				$array = explode("\n|", $content);

				foreach($array as $key) {
					$key = explode('=', $key, 2);

					if(@$key[0] == 'directions') {
						unset($key);
					}
						if(@$key[0] == 'activity_type') {
						array_push($mikomos[$i]['categories'], 'activity');
						unset($key);
					}
					if(@$key[0] == 'lounge_type') {
						array_push($mikomos[$i]['categories'], 'lounge');
						unset($key);
					}
					if(@$key[0] == 'museum_type') {
						array_push($mikomos[$i]['categories'], 'museum');
						unset($key);
					}
					if(@$key[0] == 'park_type') {
						array_push($mikomos[$i]['categories'], 'park');
						unset($key);
					}
					if(@$key[0] == 'shopping_type') {
						array_push($mikomos[$i]['categories'], 'shopping');
						unset($key);
					}

					if(@$key[0] == 'cuisine') {
						array_push($mikomos[$i]['categories'], 'restaurant');
						$mikomos[$i]['cuisine'] = [];
						$cuiArr = explode(',', $key[1]);
						if(!$cuiArr) {
							$mikomos[$i]['cuisine'] = [trim($key[1])];
						}
						else {
							foreach($cuiArr as $cui) {
								if($cui) {
									array_push($mikomos[$i]['cuisine'], trim($cui));
								}
							}
						}
						unset($key);
					}

					if(@$key[0] == 'phone') {
						$mikomos[$i]['phone'] = '';
						$remove = array(
							' ',
							'.',
							'-',
							'(',
							')'
						);
						$phone = $key[1];
						$phone = str_replace($remove, '', $phone);
						$mikomos[$i]['phone'] = trim($phone);
						unset($key);
					}
					if(@$key[0] == 'tips') {
						$mikomos[$i]['tips'] = [];
						$tipArr = explode('*', $key[1]);
						if(!$tipArr) {
							$mikomos[$i]['tips'] = [$key[1]];
						}
						else {
							foreach($tipArr as $tip) {
								if($tip) {
									array_push($mikomos[$i]['tips'], trim($tip));
								}
							}
						}
						unset($key);
					}
					if(@$key[0] == 'coordinates') {
						$split = explode(',', $key[1]);
						unset($key);
						$index = 0;
//						print_r($split);
						foreach($split as $coord) {
							$coord = trim($coord);
							if(strpos($coord, "S") || strpos($coord, "W")) {
								$coord = "-".trim((float)$coord);
							}
							elseif(strpos($coord, "N") || strpos($coord, "E")) {
								$coord = trim((float)$coord);
							}
						$split[$index] = $coord;
						++$index;
						}
						@$mikomos[$i]['coordinates']['latitude'] = $split[0];
						@$mikomos[$i]['coordinates']['longitude'] = $split[1];
					}
					if(@!$key[1]) {
						unset($key);
//						echo "****TITLE:".$page['title']."****\n";
					}
					else {
						$mikomos[$i][trim($key[0])] = trim($key[1]);
//						print_r($key);
					}
				}
/*				
				if(@$mikomos[$i]['coordinates']['latitude']) {
					$mikomos[$i]['map'] = [];
					
					$coordinates = $mikomos[$i]['coordinates']['latitude'].','.$mikomos[$i]['coordinates']['longitude'];
					$url = 'http://maps.googleapis.com/maps/api/staticmap?center='.$coordinates.'&zoom=16&size=300x150&scale=2&markers=color:red|'.$coordinates.'&key=AIzaSyAbkFRbQ567Ch8-C8yE1TjwYSBuvAMF9c8';
					$mikomos[$i]['map'] = base64_encode(file_get_contents($url));
				}
*/

//				print_r($array);
				++$i;
//			}
			}
//		sleep(15);
		}
	}
	while (@$json['query-continue']);
//	while ($false = false);

foreach($mikomos as $makom) {
	print_r($makom);
}
	
	$result['meta']['date_pulled'] = date('r');
	$result['meta']['time_pulled'] = time(true);
	$result['mikomos'] = $mikomos;
	

//	$result = array('meta' => array('date_pulled' => date(), 'epoch_pulled' => time()), array('mikomos' => $mikomos));
	file_put_contents('mikomos.json', json_encode($result));

//	print_r(json_encode($result));

?>