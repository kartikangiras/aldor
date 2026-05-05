import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { expect } from 'chai';
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

const LAMPORTS_PER_SOL = 1_000_000_000;

describe('phase1-onchain-foundation', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Aldor as Program;

  const specialist = anchor.web3.Keypair.generate();
  const orchestrator = provider.wallet as anchor.Wallet;

  let mint: anchor.web3.PublicKey;
  let orchestratorAta: anchor.web3.PublicKey;
  let specialistAta: anchor.web3.PublicKey;

  const taskSol = new Uint8Array(32).fill(7);
  const taskPalm = new Uint8Array(32).fill(8);
  const taskFail = new Uint8Array(32).fill(9);
  const taskTooDeep = new Uint8Array(32).fill(10);

  before(async () => {
    const sig = await provider.connection.requestAirdrop(specialist.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig, 'confirmed');

    mint = await createMint(
      provider.connection,
      orchestrator.payer,
      orchestrator.publicKey,
      null,
      6,
    );

    orchestratorAta = await createAssociatedTokenAccount(
      provider.connection,
      orchestrator.payer,
      mint,
      orchestrator.publicKey,
    );

    specialistAta = await createAssociatedTokenAccount(
      provider.connection,
      orchestrator.payer,
      mint,
      specialist.publicKey,
    );

    await mintTo(
      provider.connection,
      orchestrator.payer,
      mint,
      orchestratorAta,
      orchestrator.publicKey,
      5_000_000,
    );
  });

  it('registers agent and reads back fields', async () => {
    const [agentPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('agent'), specialist.publicKey.toBuffer()],
      program.programId,
    );

    await program.methods
      .registerAgent('WeatherBot', 'research', new anchor.BN(100_000), true, 'weather.aldor.sol')
      .accounts({
        agent: agentPda,
        owner: specialist.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([specialist])
      .rpc();

    const agent = await program.account.agentAccount.fetch(agentPda);
    expect(agent.owner.toBase58()).to.eq(specialist.publicKey.toBase58());
    expect(agent.name).to.eq('WeatherBot');
    expect(agent.category).to.eq('research');
    expect(agent.reputationBps.toNumber()).to.eq(5000);
    expect(agent.acceptsPalmUsd).to.eq(true);
  });

  it('creates SOL escrow job and validates vault lamports', async () => {
    const [jobPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('job'), Buffer.from(taskSol)],
      program.programId,
    );
    const [escrowSolPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow-sol'), Buffer.from(taskSol)],
      program.programId,
    );
    const [escrowAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow-authority'), Buffer.from(taskSol)],
      program.programId,
    );
    const [escrowTokenPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow-token'), Buffer.from(taskSol)],
      program.programId,
    );

    await program.methods
      .createJob(
        Array.from(taskSol),
        'SOL escrow test',
        new anchor.BN(50_000_000),
        new anchor.BN(0),
        null,
        0,
      )
      .accounts({
        job: jobPda,
        escrowSol: escrowSolPda,
        escrowAuthority,
        escrowTokenVault: escrowTokenPda,
        orchestratorTokenAccount: orchestratorAta,
        palmUsdMint: mint,
        orchestrator: orchestrator.publicKey,
        specialist: specialist.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const escrowBalance = await provider.connection.getBalance(escrowSolPda);
    expect(escrowBalance).to.be.gte(50_000_000);
  });

  it('creates Palm USD job and validates token escrow balance', async () => {
    const [jobPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('job'), Buffer.from(taskPalm)],
      program.programId,
    );
    const [escrowSolPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow-sol'), Buffer.from(taskPalm)],
      program.programId,
    );
    const [escrowAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow-authority'), Buffer.from(taskPalm)],
      program.programId,
    );
    const [escrowTokenPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow-token'), Buffer.from(taskPalm)],
      program.programId,
    );

    await program.methods
      .createJob(
        Array.from(taskPalm),
        'Palm escrow test',
        new anchor.BN(0),
        new anchor.BN(200_000),
        null,
        0,
      )
      .accounts({
        job: jobPda,
        escrowSol: escrowSolPda,
        escrowAuthority,
        escrowTokenVault: escrowTokenPda,
        orchestratorTokenAccount: orchestratorAta,
        palmUsdMint: mint,
        orchestrator: orchestrator.publicKey,
        specialist: specialist.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const vault = await getAccount(provider.connection, escrowTokenPda);
    expect(Number(vault.amount)).to.eq(200_000);
  });

  it('completes job and transfers Palm USD to specialist wallet', async () => {
    const [agentPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('agent'), specialist.publicKey.toBuffer()],
      program.programId,
    );
    const [jobPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('job'), Buffer.from(taskPalm)],
      program.programId,
    );
    const [escrowSolPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow-sol'), Buffer.from(taskPalm)],
      program.programId,
    );
    const [escrowAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow-authority'), Buffer.from(taskPalm)],
      program.programId,
    );
    const [escrowTokenPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow-token'), Buffer.from(taskPalm)],
      program.programId,
    );

    const before = await getAccount(provider.connection, specialistAta);

    await program.methods
      .completeJob(Array.from(new Uint8Array(32).fill(77)))
      .accounts({
        job: jobPda,
        agent: agentPda,
        escrowSol: escrowSolPda,
        escrowAuthority,
        escrowTokenVault: escrowTokenPda,
        specialistTokenAccount: specialistAta,
        specialist: specialist.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([specialist])
      .rpc();

    const after = await getAccount(provider.connection, specialistAta);
    expect(Number(after.amount)).to.eq(Number(before.amount) + 200_000);
  });

  it('fails job and refunds orchestrator + applies reputation penalty', async () => {
    const [jobPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('job'), Buffer.from(taskFail)],
      program.programId,
    );
    const [escrowSolPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow-sol'), Buffer.from(taskFail)],
      program.programId,
    );
    const [escrowAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow-authority'), Buffer.from(taskFail)],
      program.programId,
    );
    const [escrowTokenPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow-token'), Buffer.from(taskFail)],
      program.programId,
    );
    const [agentPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('agent'), specialist.publicKey.toBuffer()],
      program.programId,
    );

    await program.methods
      .createJob(
        Array.from(taskFail),
        'fail path',
        new anchor.BN(10_000_000),
        new anchor.BN(100_000),
        null,
        1,
      )
      .accounts({
        job: jobPda,
        escrowSol: escrowSolPda,
        escrowAuthority,
        escrowTokenVault: escrowTokenPda,
        orchestratorTokenAccount: orchestratorAta,
        palmUsdMint: mint,
        orchestrator: orchestrator.publicKey,
        specialist: specialist.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const before = await getAccount(provider.connection, orchestratorAta);

    await program.methods
      .failJob('manual failure test')
      .accounts({
        job: jobPda,
        agent: agentPda,
        escrowSol: escrowSolPda,
        escrowAuthority,
        escrowTokenVault: escrowTokenPda,
        orchestratorTokenAccount: orchestratorAta,
        orchestrator: orchestrator.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const after = await getAccount(provider.connection, orchestratorAta);
    expect(Number(after.amount)).to.eq(Number(before.amount) + 100_000);

    const agent = await program.account.agentAccount.fetch(agentPda);
    expect(agent.reputationBps.toNumber()).to.be.lessThan(5050);
  });

  it('rejects create_job when depth is 4', async () => {
    const [jobPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('job'), Buffer.from(taskTooDeep)],
      program.programId,
    );
    const [escrowSolPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow-sol'), Buffer.from(taskTooDeep)],
      program.programId,
    );
    const [escrowAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow-authority'), Buffer.from(taskTooDeep)],
      program.programId,
    );
    const [escrowTokenPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('escrow-token'), Buffer.from(taskTooDeep)],
      program.programId,
    );

    try {
      await program.methods
        .createJob(
          Array.from(taskTooDeep),
          'too deep',
          new anchor.BN(1_000_000),
          new anchor.BN(0),
          null,
          4,
        )
        .accounts({
          job: jobPda,
          escrowSol: escrowSolPda,
          escrowAuthority,
          escrowTokenVault: escrowTokenPda,
          orchestratorTokenAccount: orchestratorAta,
          palmUsdMint: mint,
          orchestrator: orchestrator.publicKey,
          specialist: specialist.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      expect.fail('expected depth guard to fail');
    } catch (error: any) {
      const msg = String(error?.message ?? error);
      expect(msg).to.match(/MaxDepthExceeded|maximum recursion depth/i);
    }
  });
});
