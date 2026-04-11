import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transfer } from './transfer.entity';
import { LeagueTeam } from '../league-teams/league-team.entity';
import { LeaguePlayer } from '../league-teams/league-player.entity';

@Injectable()
export class TransfersService {
  constructor(
    @InjectRepository(Transfer)
    private transfersRepository: Repository<Transfer>,
    @InjectRepository(LeagueTeam)
    private teamsRepository: Repository<LeagueTeam>,
    @InjectRepository(LeaguePlayer)
    private playersRepository: Repository<LeaguePlayer>,
  ) {}

  async createOffer(
    playerId: string,
    fromTeamId: string,
    toTeamId: string,
    offerAmount: number,
    userId?: string
  ) {
    const transfer = this.transfersRepository.create({
      playerId,
      fromTeamId,
      toTeamId,
      userId,
      offerAmount,
      status: 'pending',
    });

    const saved = await this.transfersRepository.save(transfer);

    // AI will evaluate the offer
    setTimeout(() => this.evaluateTransfer(saved.id), 2000);

    return saved;
  }

  async findUserTransfers(userId: string) {
    return this.transfersRepository.find({
      where: { userId },
      relations: ['player', 'fromTeam', 'toTeam'],
      order: { createdAt: 'DESC' },
    });
  }

  async findPendingTransfers() {
    return this.transfersRepository.find({
      where: { status: 'pending' },
      relations: ['player', 'fromTeam', 'toTeam'],
    });
  }

  private async evaluateTransfer(transferId: string) {
    const transfer = await this.transfersRepository.findOne({
      where: { id: transferId },
      relations: ['player', 'fromTeam', 'toTeam'],
    });

    if (!transfer || transfer.status !== 'pending') return;

    const player = transfer.player;
    const fairValue = player.price;
    const offerRatio = transfer.offerAmount / fairValue;

    let status = 'rejected';
    let aiResponse = '';
    let counterOffer = null;

    // AI decision logic
    if (offerRatio >= 1.2) {
      // 20% above value - accept
      status = 'accepted';
      aiResponse = `Great offer! We're happy to let ${player.name} go for ${transfer.offerAmount.toLocaleString()}.`;
      
      // Execute transfer
      await this.executeTransfer(transfer);
    } else if (offerRatio >= 1.0) {
      // Fair value - 50% chance accept
      if (Math.random() > 0.5) {
        status = 'accepted';
        aiResponse = `Fair offer. We'll accept ${transfer.offerAmount.toLocaleString()} for ${player.name}.`;
        await this.executeTransfer(transfer);
      } else {
        status = 'rejected';
        counterOffer = Math.floor(fairValue * 1.15);
        aiResponse = `We value ${player.name} higher. Counter-offer: ${counterOffer.toLocaleString()}.`;
      }
    } else if (offerRatio >= 0.8) {
      // Low but reasonable - counter offer
      status = 'rejected';
      counterOffer = Math.floor(fairValue * 1.1);
      aiResponse = `Too low. We'd consider ${counterOffer.toLocaleString()} for ${player.name}.`;
    } else {
      // Insulting offer
      status = 'rejected';
      aiResponse = `That's far too low for a player of ${player.name}'s quality. Not interested.`;
    }

    transfer.status = status;
    transfer.aiResponse = aiResponse;
    transfer.counterOffer = counterOffer;
    transfer.resolvedAt = new Date();

    await this.transfersRepository.save(transfer);
  }

  private async executeTransfer(transfer: Transfer) {
    // Move player to new team
    await this.playersRepository.update(
      { id: transfer.playerId },
      { teamId: transfer.toTeamId, isStarter: false, positionInFormation: null }
    );

    // Update team budgets
    await this.teamsRepository.decrement(
      { id: transfer.toTeamId },
      'budget',
      transfer.offerAmount
    );

    await this.teamsRepository.increment(
      { id: transfer.fromTeamId },
      'budget',
      transfer.offerAmount
    );
  }

  async acceptCounterOffer(transferId: string, userId: string) {
    const transfer = await this.transfersRepository.findOne({
      where: { id: transferId, userId, status: 'rejected' },
      relations: ['player'],
    });

    if (!transfer || !transfer.counterOffer) {
      throw new Error('No valid counter-offer found');
    }

    transfer.status = 'accepted';
    transfer.offerAmount = transfer.counterOffer;
    transfer.aiResponse = `Counter-offer accepted. ${transfer.player.name} is yours!`;
    transfer.resolvedAt = new Date();

    await this.transfersRepository.save(transfer);
    await this.executeTransfer(transfer);

    return transfer;
  }
}
