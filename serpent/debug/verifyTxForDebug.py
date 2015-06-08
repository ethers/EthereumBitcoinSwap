event dbgEvent(txHash:indexed, txIndex, sibling:arr, txBlockHash)
event txhEvent(txHash:indexed, val)

def verifyTx(txHash, txIndex, sibling:arr, txBlockHash):
    log(type=dbgEvent, txHash, txIndex, sibling, txBlockHash)

    merkle = self.computeMerkle(txHash, txIndex, sibling)
    log(type=txhEvent, txHash, merkle)
    
    return(0)  # always return 0 since we don't want to claim ticket

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


def computeMerkle(txHash, txIndex, sibling:arr):
    resultHash = txHash
    proofLen = len(sibling)
    i = 0
    while i < proofLen:
        proofHex = sibling[i]

        sideOfSibling = txIndex % 2  # 0 means sibling is on the right; 1 means left

        if sideOfSibling == 1:
            left = proofHex
            right = resultHash
        elif sideOfSibling == 0:
            left = resultHash
            right = proofHex

        resultHash = concatHash(left, right)

        txIndex /= 2
        i += 1

    if !resultHash:
        return(-1)

    return(resultHash)


# Bitcoin-way merkle parent of transaction hashes $tx1 and $tx2
macro concatHash($tx1, $tx2):
    with $x = ~alloc(64):
        ~mstore($x, flip32Bytes($tx1))
        ~mstore($x + 32, flip32Bytes($tx2))
        flip32Bytes(sha256(sha256($x, chars=64)))


# reverse 32 bytes given by '$b32'
macro flip32Bytes($b32):
    with $a = $b32:  # important to force $a to only be examined once below
        mstore8(ref($o), byte(31, $a))
        mstore8(ref($o) + 1,  byte(30, $a))
        mstore8(ref($o) + 2,  byte(29, $a))
        mstore8(ref($o) + 3,  byte(28, $a))
        mstore8(ref($o) + 4,  byte(27, $a))
        mstore8(ref($o) + 5,  byte(26, $a))
        mstore8(ref($o) + 6,  byte(25, $a))
        mstore8(ref($o) + 7,  byte(24, $a))
        mstore8(ref($o) + 8,  byte(23, $a))
        mstore8(ref($o) + 9,  byte(22, $a))
        mstore8(ref($o) + 10, byte(21, $a))
        mstore8(ref($o) + 11, byte(20, $a))
        mstore8(ref($o) + 12, byte(19, $a))
        mstore8(ref($o) + 13, byte(18, $a))
        mstore8(ref($o) + 14, byte(17, $a))
        mstore8(ref($o) + 15, byte(16, $a))
        mstore8(ref($o) + 16, byte(15, $a))
        mstore8(ref($o) + 17, byte(14, $a))
        mstore8(ref($o) + 18, byte(13, $a))
        mstore8(ref($o) + 19, byte(12, $a))
        mstore8(ref($o) + 20, byte(11, $a))
        mstore8(ref($o) + 21, byte(10, $a))
        mstore8(ref($o) + 22, byte(9, $a))
        mstore8(ref($o) + 23, byte(8, $a))
        mstore8(ref($o) + 24, byte(7, $a))
        mstore8(ref($o) + 25, byte(6, $a))
        mstore8(ref($o) + 26, byte(5, $a))
        mstore8(ref($o) + 27, byte(4, $a))
        mstore8(ref($o) + 28, byte(3, $a))
        mstore8(ref($o) + 29, byte(2, $a))
        mstore8(ref($o) + 30, byte(1, $a))
        mstore8(ref($o) + 31, byte(0, $a))
    $o
