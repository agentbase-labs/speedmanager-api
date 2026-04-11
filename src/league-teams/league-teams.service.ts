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

  async resetLeague() {
    console.log('🔄 Resetting league database...');
    
    // Delete all players and teams
    await this.leaguePlayersRepository.delete({});
    await this.leagueTeamsRepository.delete({});
    
    console.log('✅ Database cleared, reseeding...');
    
    // Reseed with new 18-player logic
    await this.seedLeague();
    
    return { 
      success: true, 
      message: 'League reset successful! All teams now have 18 balanced players.' 
    };
  }

  private async seedLeague() {
    console.log('🏆 Seeding league with 16 teams...');

    const teamsData = [
      // Top tier teams: $150-200M
      { name: 'Red Devils', originalName: 'Manchester United', manager: 'Erik ten Hag', budget: 180000000 },
      { name: 'Blaugrana', originalName: 'Barcelona', manager: 'Xavi Hernández', budget: 175000000 },
      { name: 'Los Blancos', originalName: 'Real Madrid', manager: 'Carlo Ancelotti', budget: 200000000 },
      { name: 'The Citizens', originalName: 'Manchester City', manager: 'Pep Guardiola', budget: 190000000 },
      { name: 'Les Parisiens', originalName: 'Paris Saint-Germain', manager: 'Luis Enrique', budget: 195000000 },
      { name: 'Die Roten', originalName: 'Bayern Munich', manager: 'Thomas Tuchel', budget: 170000000 },
      
      // Mid-tier teams: $80-120M
      { name: 'The Blues', originalName: 'Chelsea', manager: 'Mauricio Pochettino', budget: 115000000 },
      { name: 'The Reds', originalName: 'Liverpool', manager: 'Jürgen Klopp', budget: 120000000 },
      { name: 'The Gunners', originalName: 'Arsenal', manager: 'Mikel Arteta', budget: 110000000 },
      { name: 'Bianconeri', originalName: 'Juventus', manager: 'Massimiliano Allegri', budget: 95000000 },
      { name: 'Nerazzurri', originalName: 'Inter Milan', manager: 'Simone Inzaghi', budget: 90000000 },
      { name: 'Colchoneros', originalName: 'Atlético Madrid', manager: 'Diego Simeone', budget: 100000000 },
      
      // Lower tier teams: $50-80M
      { name: 'Rossoneri', originalName: 'AC Milan', manager: 'Stefano Pioli', budget: 75000000 },
      { name: 'Spurs', originalName: 'Tottenham', manager: 'Ange Postecoglou', budget: 80000000 },
      { name: 'Die Borussen', originalName: 'Borussia Dortmund', manager: 'Edin Terzić', budget: 70000000 },
      { name: 'I Lupi', originalName: 'AS Roma', manager: 'Daniele De Rossi', budget: 60000000 },
    ];

    for (const teamData of teamsData) {
      const team = this.leagueTeamsRepository.create({
        ...teamData,
        nickname: teamData.name,
        formation: this.getRandomFormation(),
        tactics: this.getRandomTactics(),
        recentForm: this.generateRandomForm(),
      });

      const savedTeam = await this.leagueTeamsRepository.save(team);
      await this.seedTeamPlayers(savedTeam.id, teamData.name);
    }

    console.log('✅ Seeded 16 teams with 18 balanced players each!');
  }

  private async seedTeamPlayers(teamId: string, teamName: string) {
    // Define specific positions with counts for realistic squad composition
    // Total: 18 players (2 GK + 6 DEF + 6 MID + 4 FWD)
    const positionGroups = [
      // Goalkeepers (2)
      { positions: ['GK', 'GK'], ratingRange: [75, 85] },
      // Defenders (6): 2 CB, 2 LB/RB, 2 flexible
      { positions: ['CB', 'CB', 'LB', 'RB', 'CB', 'RB'], ratingRange: [70, 88] },
      // Midfielders (6): mix of CM, CDM, CAM, LM, RM
      { positions: ['CM', 'CM', 'CDM', 'CAM', 'LM', 'RM'], ratingRange: [72, 90] },
      // Forwards (4): ST, wingers
      { positions: ['ST', 'ST', 'LW', 'RW'], ratingRange: [75, 92] },
    ];

    let playerIndex = 1;
    for (const group of positionGroups) {
      for (const position of group.positions) {
        const rating = Math.floor(
          group.ratingRange[0] + Math.random() * (group.ratingRange[1] - group.ratingRange[0])
        );
        
        const player = this.leaguePlayersRepository.create({
          name: this.generatePlayerName(position),
          position: position,
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
