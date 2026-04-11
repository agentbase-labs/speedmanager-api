import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeagueTeam } from './league-team.entity';
import { LeaguePlayer } from './league-player.entity';

@Injectable()
export class LeagueTeamsService implements OnModuleInit {
  constructor(
    @InjectRepository(LeagueTeam)
    private leagueTeamsRepository: Repository<LeagueTeam>,
    @InjectRepository(LeaguePlayer)
    private leaguePlayersRepository: Repository<LeaguePlayer>,
  ) {}

  async onModuleInit() {
    const count = await this.leagueTeamsRepository.count();
    if (count === 0) {
      await this.seedLeague();
    }
  }

  async findAll() {
    return this.leagueTeamsRepository.find({
      relations: ['players'],
      order: { points: 'DESC', goalsFor: 'DESC' },
    });
  }

  async findById(id: string) {
    return this.leagueTeamsRepository.findOne({
      where: { id },
      relations: ['players'],
    });
  }

  async updateFormation(teamId: string, formation: string, lineup: any[]) {
    const team = await this.findById(teamId);
    if (!team) return null;

    // Reset all players
    await this.leaguePlayersRepository.update(
      { teamId },
      { isStarter: false, positionInFormation: null }
    );

    // Update lineup
    for (const position of lineup) {
      await this.leaguePlayersRepository.update(
        { id: position.playerId },
        { 
          isStarter: true, 
          positionInFormation: position.slot 
        }
      );
    }

    team.formation = formation;
    return this.leagueTeamsRepository.save(team);
  }

  async getLeagueTable() {
    const teams = await this.leagueTeamsRepository.find({
      order: { points: 'DESC', goalsFor: 'DESC' },
    });

    return teams.map((team, index) => ({
      position: index + 1,
      team: team.name,
      played: team.wins + team.draws + team.losses,
      won: team.wins,
      drawn: team.draws,
      lost: team.losses,
      goalsFor: team.goalsFor,
      goalsAgainst: team.goalsAgainst,
      goalDifference: team.goalsFor - team.goalsAgainst,
      points: team.points,
      form: team.recentForm || [],
    }));
  }

  private async seedLeague() {
    console.log('🏆 Seeding league with 16 teams...');

    const teamsData = [
      { name: 'Red Devils', originalName: 'Manchester United', manager: 'Erik ten Hag' },
      { name: 'Blaugrana', originalName: 'Barcelona', manager: 'Xavi Hernández' },
      { name: 'Los Blancos', originalName: 'Real Madrid', manager: 'Carlo Ancelotti' },
      { name: 'The Blues', originalName: 'Chelsea', manager: 'Mauricio Pochettino' },
      { name: 'The Reds', originalName: 'Liverpool', manager: 'Jürgen Klopp' },
      { name: 'The Citizens', originalName: 'Manchester City', manager: 'Pep Guardiola' },
      { name: 'The Gunners', originalName: 'Arsenal', manager: 'Mikel Arteta' },
      { name: 'Bianconeri', originalName: 'Juventus', manager: 'Massimiliano Allegri' },
      { name: 'Die Roten', originalName: 'Bayern Munich', manager: 'Thomas Tuchel' },
      { name: 'Les Parisiens', originalName: 'Paris Saint-Germain', manager: 'Luis Enrique' },
      { name: 'Rossoneri', originalName: 'AC Milan', manager: 'Stefano Pioli' },
      { name: 'Nerazzurri', originalName: 'Inter Milan', manager: 'Simone Inzaghi' },
      { name: 'Spurs', originalName: 'Tottenham', manager: 'Ange Postecoglou' },
      { name: 'Die Borussen', originalName: 'Borussia Dortmund', manager: 'Edin Terzić' },
      { name: 'Colchoneros', originalName: 'Atlético Madrid', manager: 'Diego Simeone' },
      { name: 'I Lupi', originalName: 'AS Roma', manager: 'Daniele De Rossi' },
    ];

    for (const teamData of teamsData) {
      const team = this.leagueTeamsRepository.create({
        ...teamData,
        nickname: teamData.name,
        budget: Math.floor(50000000 + Math.random() * 50000000),
        formation: this.getRandomFormation(),
        tactics: this.getRandomTactics(),
        recentForm: this.generateRandomForm(),
      });

      const savedTeam = await this.leagueTeamsRepository.save(team);
      await this.seedTeamPlayers(savedTeam.id, teamData.name);
    }

    console.log('✅ Seeded 16 teams with 18 players each!');
  }

  private async seedTeamPlayers(teamId: string, teamName: string) {
    const positions = [
      // Goalkeepers (2)
      { position: 'Goalkeeper', count: 2, ratingRange: [78, 88] },
      // Defenders (6)
      { position: 'Defender', count: 6, ratingRange: [75, 89] },
      // Midfielders (6)
      { position: 'Midfielder', count: 6, ratingRange: [76, 90] },
      // Forwards (4)
      { position: 'Forward', count: 4, ratingRange: [77, 91] },
    ];

    let playerIndex = 1;
    for (const posGroup of positions) {
      for (let i = 0; i < posGroup.count; i++) {
        const rating = Math.floor(
          posGroup.ratingRange[0] + Math.random() * (posGroup.ratingRange[1] - posGroup.ratingRange[0])
        );
        
        const player = this.leaguePlayersRepository.create({
          name: this.generatePlayerName(posGroup.position),
          position: posGroup.position,
          rating,
          price: this.calculatePrice(rating),
          teamId,
          isStarter: playerIndex <= 11, // First 11 are starters
          positionInFormation: playerIndex <= 11 ? playerIndex : null,
          fitness: 85 + Math.floor(Math.random() * 15),
          morale: 'Normal',
        });

        await this.leaguePlayersRepository.save(player);
        playerIndex++;
      }
    }
  }

  private generatePlayerName(position: string): string {
    const firstNames = ['Alex', 'Bruno', 'Carlos', 'David', 'Erik', 'Fernando', 'Gabriel', 'Hugo', 'Ivan', 'João', 'Kevin', 'Lucas', 'Marco', 'Nicolás', 'Oscar', 'Paulo', 'Rafael', 'Sergio', 'Thomas', 'Victor'];
    const lastNames = ['Silva', 'Santos', 'Costa', 'Fernández', 'García', 'Martínez', 'Rodríguez', 'López', 'González', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz', 'Morales', 'Reyes'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return `${firstName} ${lastName}`;
  }

  private calculatePrice(rating: number): number {
    const basePrice = 500000;
    const multiplier = Math.pow(1.15, rating - 70);
    return Math.floor(basePrice * multiplier);
  }

  private getRandomFormation(): string {
    const formations = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '3-4-3'];
    return formations[Math.floor(Math.random() * formations.length)];
  }

  private getRandomTactics(): string {
    const tactics = ['Attacking', 'Balanced', 'Defensive'];
    return tactics[Math.floor(Math.random() * tactics.length)];
  }

  private generateRandomForm(): string[] {
    const results = ['W', 'D', 'L'];
    const form = [];
    for (let i = 0; i < 5; i++) {
      form.push(results[Math.floor(Math.random() * results.length)]);
    }
    return form;
  }
}
