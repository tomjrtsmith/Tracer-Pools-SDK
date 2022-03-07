jest.mock('ethers');

import { ethers } from 'ethers';
const { utils, BigNumber } = jest.requireActual('ethers');
ethers.utils = utils;
ethers.BigNumber = BigNumber;

import Committer from '../src/entities/committer';
import { CommitEnum } from '../src/types';
import { BigNumber as BigNumberJS } from 'bignumber.js';

const QUOTE_TOKEN_DECIMALS = 6

const expected = {
	address: '0xCommitterAddress',
	pendingLong: {
		burn: new BigNumberJS(100),
		mint: new BigNumberJS(0)
	},
	pendingShort: {
		mint: new BigNumberJS(100),
		burn: new BigNumberJS(0)
	},
	frontRunningPendingLong: {
		burn: new BigNumberJS(20),
		mint: new BigNumberJS(20)
	},
	frontRunningPendingShort: {
		mint: new BigNumberJS(10),
		burn: new BigNumberJS(10)
	},
}
interface CommitterInfo {
	address: string;
	pendingLong: {
		burn: number,
		mint: number,
	};
	pendingShort: {
		burn: number,
		mint: number,
	};
}

const committerInfo: CommitterInfo = {
	address: expected.address,
	pendingLong: {
		mint: expected.pendingLong.mint.toNumber(),
		burn: expected.pendingLong.burn.toNumber(),
	},
	pendingShort: {
		mint: expected.pendingShort.mint.toNumber(),
		burn: expected.pendingShort.burn.toNumber()
	}
}

const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');

const createCommitter: (config?: CommitterInfo) => Promise<Committer> = async (config) => {
	return (
		config	
			? Committer.Create({
				...config,
				address: committerInfo.address,
				provider: provider,
				quoteTokenDecimals: QUOTE_TOKEN_DECIMALS
			})
			: Committer.Create({
				address: committerInfo.address,
				provider: provider,
				quoteTokenDecimals: QUOTE_TOKEN_DECIMALS
			})
	)
}


const assertCommitter: (committer: Committer) => void = (committer) => {
	expect(committer.address).toEqual(expected.address);
	expect(committer.pendingLong.burn).toEqual(expected.pendingLong.burn.plus(expected.frontRunningPendingLong.burn));
	expect(committer.pendingLong.mint).toEqual(expected.pendingLong.mint.plus(expected.frontRunningPendingLong.mint));
	expect(committer.pendingShort.burn).toEqual(expected.pendingShort.burn.plus(expected.frontRunningPendingShort.burn));
	expect(committer.pendingShort.mint).toEqual(expected.pendingShort.mint.plus(expected.frontRunningPendingShort.mint));
}

const mockCommitter = {
	// committer functions
	getPendingCommits: async () => {
		return ([
			[
				ethers.utils.parseUnits(expected.frontRunningPendingLong.burn.toString(), QUOTE_TOKEN_DECIMALS), // longBurns
				ethers.utils.parseUnits(expected.frontRunningPendingLong.mint.toString(), QUOTE_TOKEN_DECIMALS), // longMints
				ethers.utils.parseUnits(expected.frontRunningPendingShort.burn.toString(), QUOTE_TOKEN_DECIMALS), // shortBurns
				ethers.utils.parseUnits(expected.frontRunningPendingShort.mint.toString(), QUOTE_TOKEN_DECIMALS), // shortMints
				// TODO add flip commits
			],
			[
				ethers.utils.parseUnits(expected.pendingLong.burn.toString(), QUOTE_TOKEN_DECIMALS), // longBurns
				ethers.utils.parseUnits(expected.pendingLong.mint.toString(), QUOTE_TOKEN_DECIMALS), // longMints
				ethers.utils.parseUnits(expected.pendingShort.burn.toString(), QUOTE_TOKEN_DECIMALS), // shortBurns
				ethers.utils.parseUnits(expected.pendingShort.mint.toString(), QUOTE_TOKEN_DECIMALS), // shortMints
				// TODO add flip commits
			]
		])
	}
}

describe('Testing committer constructor', () => {
	// @ts-ignore
	ethers.Contract.mockImplementation(() => ({
		...mockCommitter
	}))

	it('No input', () => {
		return createCommitter().then((committer) => (
			assertCommitter(committer)
		))
	});
	it('Full input', async () => {
		return (
			createCommitter(committerInfo).then((committer) => (
				assertCommitter(committer)
			))
		)
	});
	it('Creating default', () => {
		const committer = Committer.CreateDefault();
		expect(committer.address).toEqual('');
		expect(committer.pendingLong.burn.toNumber()).toEqual(0);
		expect(committer.pendingLong.mint.toNumber()).toEqual(0);
		expect(committer.pendingShort.burn.toNumber()).toEqual(0);
		expect(committer.pendingShort.mint.toNumber()).toEqual(0);
		expect(committer.quoteTokenDecimals).toEqual(18);
		expect(() => committer.connect(null)).toThrow('Failed to connect Committer: provider cannot be undefined')
	});
});

describe('Testing commit' ,() => {
	it('_contract is undefined', async () => {
		const committer = await createCommitter()
		committer._contract = undefined;
		expect(() => committer.commit(CommitEnum.longBurn, 1000)).toThrow("Failed to commit: this._contract undefined")
	})
})

describe('Testing fetchShadowPool', () => {
	// @ts-ignore
	ethers.Contract.mockImplementation(() => ({
		...mockCommitter
	}))
	it('_contract is undefined', async () => {
		const committer = await createCommitter()
		committer._contract = undefined;
		await expect(async () => await committer.fetchAllShadowPools())
			.rejects
			.toThrow("Failed to update pending amounts: this._contract undefined")
	})
	it('Successfuly fetch and set', async () => {
		const committer = await createCommitter()
		const { pendingLong, pendingShort } = await committer.fetchAllShadowPools();

		expect(pendingLong.burn).toEqual(expected.pendingLong.burn.plus(expected.frontRunningPendingLong.burn));
		expect(committer.pendingLong.burn).toEqual(expected.pendingLong.burn.plus(expected.frontRunningPendingLong.burn));
		expect(pendingLong.mint).toEqual(expected.pendingLong.mint.plus(expected.frontRunningPendingLong.mint));
		expect(committer.pendingLong.mint).toEqual(expected.pendingLong.mint.plus(expected.frontRunningPendingLong.mint));
		expect(pendingShort.burn).toEqual(expected.pendingShort.burn.plus(expected.frontRunningPendingShort.burn));
		expect(committer.pendingShort.burn).toEqual(expected.pendingShort.burn.plus(expected.frontRunningPendingShort.burn));
		expect(pendingShort.mint).toEqual(expected.pendingShort.mint.plus(expected.frontRunningPendingShort.mint));
		expect(committer.pendingShort.mint).toEqual(expected.pendingShort.mint.plus(expected.frontRunningPendingShort.mint));
	})
})
