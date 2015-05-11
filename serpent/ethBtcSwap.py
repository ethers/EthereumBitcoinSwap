
# TODO
# claimer 20bytes, claimExpiry 2bytes
# claimTxHash are 32bytes each
# btcAddr 20 bytes, numWei 10bytes, weiPerSatoshi 2bytes


data gTicket[2**64](_btcAddr, _numWei, _weiPerSatoshi, _claimer, _claimExpiry, _claimTxHash)

data gTicketId

def createTicket(btcAddr, numWei, weiPerSatoshi):
    self.gTicketId += 1
    # use var for gTicketId ?
    self.gTicket[self.gTicketId]._btcAddr = btcAddr
    self.gTicket[self.gTicketId]._numWei = numWei
    self.gTicket[self.gTicketId]._weiPerSatoshi = weiPerSatoshi
    # claimData left as zeros
