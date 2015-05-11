contract EthereumBitcoinSwap {
	address constant specialTxContract = 0xbeefbeefbeefbeefbeefbeefbeefbeefbeefbeef;
	
	struct TicketData {
		address btcAddr;
		uint80 numWei;
		bytes2 weiPerSatoshi;
	}
	
	struct ClaimData {
		address claimer;
		uint16 claimExpiry;  // 16b or less?
		bytes32 claimTxHash;
	}
	
	struct Ticket {
		TicketData ticketData;
		ClaimData claimData;
	}
	
	// try saving with uint64 ?
	uint private gTicketId = 0;
	
	mapping (uint => Ticket) gTicket;
	
	function createTicket(address btcAddr, uint80 numWei, bytes2 weiPerSatoshi) external returns (uint) {
		gTicketId++;
		gTicket[gTicketId].ticketData.btcAddr = btcAddr;
		gTicket[gTicketId].ticketData.numWei = numWei;
		gTicket[gTicketId].ticketData.weiPerSatoshi = weiPerSatoshi;
		// claimData left as zeros
	}

	function reserveTicket(uint ticketId, bytes32 txHash) external returns (bytes1) {
		if (block.timestamp <= gTicket[ticketId].claimData.claimExpiry ||
			msg.value < gTicket[ticketId].ticketData.numWei / 20) {  // required deposit is 5% numWei
			return 0;
		}

		gTicket[ticketId].claimData.claimer = msg.sender;
		gTicket[ticketId].claimData.claimExpiry = uint16(block.timestamp + 3600 * 4);
		gTicket[ticketId].claimData.claimTxHash = txHash;
		return 1;
	}

	function claimTicket(uint ticketId, bytes txStr, bytes32 txHash, uint64 txIndex, bytes32[] sibling, bytes32 txBlockHash) external returns (bytes1) {
		if (txHash != gTicket[ticketId].claimData.claimTxHash) {
			return 0;
		}

		// can't pass arrays (sibling) yet, Mix says: non byte arrays not yet implemented here
		specialTxContract.call("verifyTx", txHash, txIndex, sibling, txBlockHash);
	}

}
