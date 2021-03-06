<?php

/**
 * vworker.com parser
 * @author Kalashnikov Igor <igor.kalashnikov@gmail.com>
 * @license Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported
 */
class Parser_vworker_com extends Parser implements IParser {

	public function getSiteCode() {
		return 5;
	}
	
	public function getSiteName() {
		return 'vworker.com';
	}
	
	public function getSiteFolder() {
		return 'vworker_com';
	}
	
	public function getParserName() {
		return 'VWorker parser 1.0';
	}
	
	public function getUrl() {
		return 'http://www.vworker.com';
	}

	public function getUpdatePeriod() {
		return 60 * 3;   // 3 minutes
	}
	
	public function getLang() {
		return Language::ENGLISH;
	}
	
	public function isProxyfied() {
		return false;
	}

	public function isAuth() {
		return false;
	}
	
	protected function afterRequest($data) {
		return iconv('iso-8859-1', 'utf-8', $data);
	}	
	
	public function processJobList() {
		$res = $this->getRequest('http://www.vworker.com/RentACoder/misc/BidRequests/ShowBidRequests.asp?intFirstRecordOnPage=1&intLastRecordOnPage=10&txtMaxNumberOfEntriesPerPage=10&optSortTitle=2&blnAuthorSearch=False&optBidRequestPhase=2&lngBidRequestListType=3&lngSortColumn=-6&lngBidRequestCategoryId=-1&optBiddingExpiration=1&cmdGoToPage=1');

		if (!$res)
			return false;

/*
<a href="/RentACoder/misc/BidRequests/ShowBidRequest.asp?lngBidRequestId=1491325"> 
	<b>Word Press Theme Install</b>
</a> 
*/

		preg_match_all('/(\/RentACoder\/misc\/BidRequests\/ShowBidRequest.asp\?lngBidRequestId=(\d+))"/', $res, $matches);
		
		array_shift($matches);
		
		if (2 != count($matches))
			return;
		
		$matches = array_combine($matches[1], $matches[0]);

		foreach($matches as $id => $match) {
			$this->queueJobLink($id, 'http://www.vworker.com' . $match);
		}
	}
	
	public function parseJobTitle($content) {
		if (
			!preg_match('/<h1>(.*?)<br>/iu', $content, $matches)
			|| 2 != count($matches)
		) {
			return false;
		}
				
		return trim($matches[1]);
	}
	
	public function parseJobDescription($content) {
		if (
			preg_match('/<div class="KonaBody">(.*?)<\/font>/siu', $content, $matches)
			&& 2 == count($matches)
		) {
			$found = $matches[1];
		}

		if (isset($found)) {
			// search for the outer warning links
			if (
				preg_match_all('@"/RentACoder/DotNet/WarningPage.aspx(.*?)ExternalUrl=(.*?)"@iu', $found, $matches) &&
				3 === sizeof($matches)
			) {
				$links = $matches[0];
				$urls  = $matches[2];

				foreach($links as $key => $link) {
					$found = str_replace($link, '"' . urldecode($urls[$key]) . '"', $found);
				}
			}

			return trim(str_replace(array("\r", "\n"), '', $found));
		} else
			return false;
	}
	
	public function parseJobCategories($content) {
		if (
			!preg_match('/Categories:(.*?)<font size=1>(.*?)<br>(.*?)<\/font>/is', $content, $matches)
			|| 4 != count($matches)
		) {
			return false;
		}
		
		return trim(array_pop($matches));
	}
	
	public function parseJobMoney($content) {
		if (
			preg_match('/Max Accepted Bid:(.*?)size="1">(.*?)\(<a/siu', $content, $matches)
			&& 3 == count($matches)
		) {
			$val = trim(str_replace('&nbsp;', '', array_pop($matches)));
			
			if (false !== mb_strpos($val, '$')) {
				$currency = Job::CUR_DOLLAR;
				
				$val = floatval(trim(preg_replace('/\$/siu', '', $val)));
			}
			
			if (
				isset($currency)
				&& $val != 0
			) {
				return array(
					$val,
					$currency
				);
			}
		}
		
		return false;
	}
		
}
