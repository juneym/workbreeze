<?

require(PATH_CLASSES . 'parser.php');

class Scheduler {

	private $db;
	private $parsers;

	public function __construct($db) {
		$this->db = $db;
	}
	
	private function initParser($info) {
		if (!isset($this->parsers[$info['code']])) {	
			require('parsers/' . $info['script']);	
			$this->parsers[$info['code']] = new $info['class']($this->db);
		}
		
		return $this->parsers[$info['code']];
	}

	public function updateGlobalRSS() {
		echo '[' . date('H:m:s') . "] Updating global RSS channel...\n";
		
		$sites = $this->db->sites;
		
		$st = array();
		
		$cursor = $this->db->jobs->find();
		$cursor->sort(array('stamp' => -1));
		$cursor->limit(25);
		
		date_default_timezone_set('GMT');
		
		$writer = new XMLWriter();
		$writer->openURI(PATH_PUBLIC . 'jobs/rss-global.xml');
		if (defined('DEBUG')) {
			$writer->setIndent(4);
		}
		$writer->startDocument('1.0');
		$writer->startElement('rss');
		$writer->writeAttribute('version', '2.0');
		$writer->writeAttribute('xmlns:atom', 'http://www.w3.org/2005/Atom');		
		
		$writer->startElement('channel');
		$writer->writeElement('title', 'WorkBreeze');
		$writer->writeElement('description', 'WorkBreeze');
		$writer->writeElement('link', 'http://workbreeze.com');
		$writer->writeElement('ttl', 5);
		$writer->writeElement('pubDate', date('D, d M Y H:i:s e'));
		
		while ($item = $cursor->getNext()) {
			$writer->startElement('item');
			
			if (!isset($st[$item['site']])) {
				$st[$item['site']] = $sites->findOne(array('code' => $item['site']));
			}
			
			$s = $st[$item['site']];
			
			$writer->writeElement('title', $s['name'] . ': ' . $item['title']);
			$writer->writeElement('link', 'http://workbreeze.com/jobs/' . 
				$s['folder'] . '/' . $item['id'] . '.html');
			$writer->startElement('description');
			
			$cdata = <<<EOF
{$item['desc']}<br /><p style="padding: 0.2em; background-color: silver; border: 1px dotted black; align: center;" align="center"><a href="{$item['url']}">{$item['title']}</a></p>
EOF;
			
			$writer->writeCData($cdata);
			$writer->endElement();
			
			$writer->writeElement('guid', 'http://workbreeze.com/jobs/' . 
				$s['folder'] . '/' . $item['id'] . '.html');
				
			$writer->writeElement('pubDate', date('D, d M Y H:i:s e', $item['stamp']));
			
			$writer->endElement();
		}
		
		$writer->endElement(); // </channel>
		$writer->endElement(); // </rss>
		$writer->endDocument();
		
		$writer->flush();
	}

	public function processJobList() {
		$c = $this->db->sites->find();

		while ($site = $c->getNext()) {					
			$parser = $this->initParser($site);
		
			if (
				isset($site['stamp'])
				&& (time() - (int) $site['stamp']) < $parser->getUpdatePeriod() - 1
			) {
				continue;
			}

			echo '[' . date('H:m:s') . '] Process main pages for ' . $site['name'] . "\n";
			
			$this->db->sites->update(
				array('code' => $site['code']),
				array('$set' => 
					array(
						'stamp' => time()
					)
				)
			);

			$parser->processJobList();
			
			if ($parser->getQueuedCount() > 0) {
				$this->db->slog->remove(array(
					'site'  => $parser->getSiteCode(),
					'wyear' => array('$lt' => date('W'))
				));
			
				$this->db->slog->insert(array(
					'site'  => $parser->getSiteCode(),
					'wday'  => date('N'),
					'wyear' => date('W'),
					'time'  => date('G') * 60 + date('i'),
					'count' => $parser->getQueuedCount()
				));
			}
		}
	}
	
	public function processQueue() {	
		$queue = $this->db->queue;
		$sites = $this->db->sites;
		
		$c = $queue->find();
		$c->sort(array('rnd' => 1));
		$c->limit(20);
		
		$cnt = 0;

		while ($item = $c->getNext()) {
			$cnt++;

			$site = $sites->findOne(array('code' => $item['site']));
			
			if (null === $site)
				continue;
				
			$parser = $this->initParser($site);
			
			if ('job' === $item['type']) {
				if ($parser->processJob($item['id'], $item['url'])) {
					$queue->remove(array('_id' => $item['_id']));	
					// stamps must be unique
					sleep(1);
				}
			}
		}

		if ($cnt > 0) {
			$this->updateGlobalRSS();
		}
	}

}
