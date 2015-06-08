event dbgEvent(txHash:indexed, txIndex, sibling:arr, txBlockHash)
event txhEvent(txHash:indexed, val)

def verifyTx(txHash, txIndex, sibling:arr, txBlockHash):
    log(type=dbgEvent, txHash, txIndex, sibling, txBlockHash)
    return(13)

    # val = self.within6Confirms(txBlockHash)
    # log(type=txhEvent, txHash, val)
    #
    # !self.inMainChain(txBlockHash)
    # log(type=txhEvent, txHash, val)
    #
    # if self.within6Confirms(txBlockHash) || !self.inMainChain(txBlockHash):
    #     return(0)
    #
    # merkle = self.computeMerkle(txHash, txIndex, sibling)
    # log(type=txhEvent, txHash, merkle)
    #
    # realMerkleRoot = getMerkleRoot(txBlockHash)
    # log(type=txhEvent, txHash, realMerkleRoot)
    #
    # if merkle == realMerkleRoot:
    #     log(type=txhEvent, txHash, 12)
    #     return(1)
    # else:
    #     log(type=txhEvent, txHash, 13)
    #     return(0)
