import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeagueTeam } from './league-team.entity';
import { LeaguePlayer } from './league-player.entity';

@Injectable()
export class LeagueTeamsService implements OnModuleInit {
  private usedPlayerNames: Set<string> = new Set();

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

    // Update formation
    team.formation = formation;

    // Only update lineup if provided
    if (lineup && lineup.length > 0) {
      // ✅ VALIDATION: Check for exactly 1 GK in lineup
      const gkCount = lineup.filter(pos => {
        const player = team.players.find(p => p.id === pos.playerId);
        return player?.position === 'GK';
      }).length;
      
      if (gkCount !== 1) {
        throw new Error(`Invalid formation: Must have exactly 1 goalkeeper (found ${gkCount})`);
      }
      
      // Validate we have exactly 11 starters
      if (lineup.length !== 11) {
        throw new Error(`Invalid formation: Must have exactly 11 players (found ${lineup.length})`);
      }
      
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
    }

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
    
    // First, clear all users' leagueTeamId to avoid foreign key constraint
    await this.leagueTeamsRepository.query(
      'UPDATE users SET "leagueTeamId" = NULL WHERE "leagueTeamId" IS NOT NULL'
    );
    
    // Delete all players first (to avoid foreign key constraint issues)
    await this.leaguePlayersRepository.createQueryBuilder().delete().execute();
    // Then delete all teams
    await this.leagueTeamsRepository.createQueryBuilder().delete().execute();
    
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
    
    // Reset used names tracker
    this.usedPlayerNames.clear();

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
    // Total: 18 players (1 GK + 1 backup GK + 6 DEF + 6 MID + 4 FWD)
    // ⚠️ BUG FIX: Changed from 2 GK to 1 GK + 1 backup to prevent duplicate GKs in starting XI
    const positionGroups = [
      // Goalkeepers (1 starter + 1 backup = 2 total)
      { positions: ['GK'], ratingRange: [78, 88], isStarter: true },
      { positions: ['GK'], ratingRange: [70, 78], isStarter: false },
      // Defenders (6): 2 CB, 2 LB/RB, 2 flexible
      { positions: ['CB', 'CB', 'LB', 'RB', 'CB', 'RB'], ratingRange: [70, 88], isStarter: true },
      // Midfielders (6): mix of CM, CDM, CAM, LM, RM
      { positions: ['CM', 'CM', 'CDM', 'CAM', 'LM', 'RM'], ratingRange: [72, 90], isStarter: true },
      // Forwards (4): ST, wingers (3 starters + 1 bench)
      { positions: ['ST', 'ST', 'LW'], ratingRange: [78, 92], isStarter: true },
      { positions: ['RW'], ratingRange: [75, 88], isStarter: false },
    ];

    let starterIndex = 1;
    let benchIndex = 1;
    
    for (const group of positionGroups) {
      for (const position of group.positions) {
        const rating = Math.floor(
          group.ratingRange[0] + Math.random() * (group.ratingRange[1] - group.ratingRange[0])
        );
        
        const isStarter = group.isStarter !== false && starterIndex <= 11;
        
        const player = this.leaguePlayersRepository.create({
          name: this.generatePlayerName(position),
          position: position,
          rating,
          price: this.calculatePrice(rating),
          teamId,
          isStarter,
          positionInFormation: isStarter ? starterIndex : null,
          fitness: 85 + Math.floor(Math.random() * 15),
          morale: 'Normal',
        });

        await this.leaguePlayersRepository.save(player);
        
        if (isStarter) {
          starterIndex++;
        } else {
          benchIndex++;
        }
      }
    }
    
    // ✅ VALIDATION: Ensure exactly 1 GK in starting XI
    const starters = await this.leaguePlayersRepository.find({
      where: { teamId, isStarter: true }
    });
    
    const gkCount = starters.filter(p => p.position === 'GK').length;
    if (gkCount !== 1) {
      console.error(`❌ VALIDATION FAILED: Team ${teamId} has ${gkCount} GKs in starting XI`);
      throw new Error(`Invalid lineup: ${gkCount} goalkeepers in starting XI`);
    }
  }

  private generatePlayerName(position: string): string {
    // Real football legends and superstars organized by position
    // Mix of Modern Era Superstars + Legendary Icons + Special Players
    const playersByPosition = {
      'GK': [
        // Modern Superstars
        'Thibaut Courtois', 'Alisson Becker', 'Jan Oblak', 'Ederson',
        'Marc-André ter Stegen', 'Mike Maignan', 'Emiliano Martínez', 'Manuel Neuer',
        'Yassine Bounou', 'André Onana', 'Unai Simón', 'David Raya',
        // Legends
        'Gianluigi Buffon', 'Iker Casillas', 'Petr Čech', 'Edwin van der Sar',
        'Oliver Kahn', 'Dino Zoff', 'Lev Yashin', 'Gordon Banks',
        'Sepp Maier', 'Peter Schmeichel', 'Neville Southall', 'Pat Jennings'
      ],
      'CB': [
        // Modern Superstars
        'Virgil van Dijk', 'Antonio Rüdiger', 'Ruben Dias', 'Marquinhos',
        'William Saliba', 'Kim Min-jae', 'Eder Militão', 'Jules Koundé',
        'Cristian Romero', 'Lisandro Martínez', 'Gabriel Magalhães', 'Ben White',
        // Legends
        'Franz Beckenbauer', 'Paolo Maldini', 'Franco Baresi', 'Fabio Cannavaro',
        'Alessandro Nesta', 'Carles Puyol', 'John Terry', 'Rio Ferdinand',
        'Nemanja Vidić', 'Giorgio Chiellini', 'Thiago Silva', 'Sergio Ramos',
        'Gaetano Scirea', 'Bobby Moore', 'Daniel Passarella', 'Ronald Koeman',
        'Matthias Sammer', 'Laurent Blanc', 'Marcel Desailly', 'Jaap Stam'
      ],
      'LB': [
        // Modern Superstars
        'Alphonso Davies', 'Theo Hernández', 'Andrew Robertson', 'João Cancelo',
        'Ferland Mendy', 'Luke Shaw', 'Ben Chilwell', 'Nuno Mendes',
        'Oleksandr Zinchenko', 'Pervis Estupiñán', 'Alex Telles', 'David Raum',
        // Legends
        'Roberto Carlos', 'Ashley Cole', 'Marcelo', 'Philipp Lahm',
        'Giacinto Facchetti', 'Andreas Brehme', 'Patrice Evra', 'Denis Irwin'
      ],
      'RB': [
        // Modern Superstars
        'Trent Alexander-Arnold', 'Reece James', 'Achraf Hakimi', 'Kyle Walker',
        'Dani Carvajal', 'João Cancelo', 'Kieran Trippier', 'Pedro Porro',
        'Jeremie Frimpong', 'Denzel Dumfries', 'Malo Gusto', 'Diogo Dalot',
        // Legends
        'Cafu', 'Dani Alves', 'Philipp Lahm', 'Javier Zanetti',
        'Lilian Thuram', 'Carlos Alberto', 'Willy Sagnol', 'Maicon'
      ],
      'CDM': [
        // Modern Superstars
        'Rodri', 'Casemiro', 'Joshua Kimmich', 'Declan Rice',
        'Aurélien Tchouaméni', 'Fabinho', 'William Carvalho', 'Édson Álvarez',
        'Moisés Caicedo', 'Romeo Lavia', 'Martin Zubimendi', 'Douglas Luiz',
        // Legends + Special
        'Claude Makélélé', 'N\'Golo Kanté', 'Sergio Busquets', 'Roy Keane',
        'Patrick Vieira', 'Lothar Matthäus', 'Frank Rijkaard', 'Fernando Redondo',
        'Xabi Alonso', 'Michael Ballack', 'Javier Mascherano', 'Daniele De Rossi'
      ],
      'CM': [
        // Modern Superstars
        'Kevin De Bruyne', 'Luka Modrić', 'Jude Bellingham', 'Federico Valverde',
        'Bernardo Silva', 'Frenkie de Jong', 'İlkay Gündoğan', 'Bruno Fernandes',
        'Martin Ødegaard', 'Nicolò Barella', 'Mateo Kovačić', 'Leon Goretzka',
        'Phil Foden', 'Eduardo Camavinga', 'Vitinha', 'Warren Zaïre-Emery',
        // Legends + Roy Hogeg (Legendary Special Player)
        'Zinedine Zidane', 'Diego Maradona', 'Roy Hogeg', 'Andrés Iniesta',
        'Xavi Hernández', 'Steven Gerrard', 'Frank Lampard', 'Paul Scholes',
        'Michel Platini', 'Lothar Matthäus', 'Clarence Seedorf', 'Deco',
        'Kaká', 'Wesley Sneijder', 'David Silva', 'Toni Kroos', 'Andrea Pirlo',
        'Michael Laudrup', 'Juan Sebastián Verón', 'Edgar Davids'
      ],
      'CAM': [
        // Modern Superstars
        'Phil Foden', 'Martin Ødegaard', 'Bruno Fernandes', 'Jude Bellingham',
        'Christopher Nkunku', 'Florian Wirtz', 'James Maddison', 'Mason Mount',
        'Jamal Musiala', 'Jack Grealish', 'Dani Olmo', 'Kai Havertz',
        // Legends
        'Diego Maradona', 'Zinedine Zidane', 'Ronaldinho', 'Kaká',
        'Michel Platini', 'Roberto Baggio', 'Juan Román Riquelme', 'Zico',
        'Francesco Totti', 'Rivaldo', 'Gianfranco Zola', 'Dennis Bergkamp'
      ],
      'LM': [
        // Modern Superstars
        'Vinícius Jr', 'Rafael Leão', 'Khvicha Kvaratskhelia', 'Luis Díaz',
        'Marcus Rashford', 'Gabriel Martinelli', 'Nico Williams', 'Leroy Sané',
        'Kingsley Coman', 'Ousmane Dembélé', 'João Félix', 'Jadon Sancho',
        // Legends
        'Ronaldinho', 'Rivaldo', 'Ryan Giggs', 'Pavel Nedvěd',
        'Robert Pires', 'Marc Overmars', 'Franck Ribéry', 'Eden Hazard'
      ],
      'RM': [
        // Modern Superstars
        'Bukayo Saka', 'Mohamed Salah', 'Serge Gnabry', 'Federico Chiesa',
        'Ousmane Dembélé', 'Raphinha', 'Antony', 'Riyad Mahrez',
        'Jarrod Bowen', 'Khvicha Kvaratskhelia', 'Dejan Kulusevski', 'Bryan Mbeumo',
        // Legends
        'David Beckham', 'Arjen Robben', 'Gareth Bale', 'Luis Figo',
        'Jairzinho', 'Ángel Di María', 'Andres Iniesta', 'George Best'
      ],
      'ST': [
        // Modern Superstars
        'Kylian Mbappé', 'Erling Haaland', 'Harry Kane', 'Robert Lewandowski',
        'Karim Benzema', 'Victor Osimhen', 'Lautaro Martínez', 'Darwin Núñez',
        'Dusan Vlahović', 'Ivan Toney', 'Alexander Isak', 'Julián Álvarez',
        'Gonçalo Ramos', 'Rasmus Højlund', 'Ollie Watkins', 'Randal Kolo Muani',
        // Legends
        'Pelé', 'Ronaldo Nazário', 'Thierry Henry', 'Marco van Basten',
        'Gerd Müller', 'Romário', 'George Weah', 'Gabriel Batistuta',
        'Alan Shearer', 'Ruud van Nistelrooy', 'Didier Drogba', 'Zlatan Ibrahimović',
        'Sergio Agüero', 'Luis Suárez', 'Samuel Eto\'o', 'Fernando Torres',
        'Henrik Larsson', 'Andriy Shevchenko', 'Filippo Inzaghi', 'David Villa'
      ],
      'LW': [
        // Modern Superstars
        'Vinícius Jr', 'Neymar Jr', 'Son Heung-min', 'Rafael Leão',
        'Khvicha Kvaratskhelia', 'Marcus Rashford', 'Gabriel Martinelli', 'Jack Grealish',
        'Luis Díaz', 'Nico Williams', 'Cody Gakpo', 'Ansu Fati',
        // Legends
        'Cristiano Ronaldo', 'Thierry Henry', 'Ronaldinho', 'Rivaldo',
        'Ryan Giggs', 'Pavel Nedvěd', 'Eden Hazard', 'Franck Ribéry'
      ],
      'RW': [
        // Modern Superstars
        'Mohamed Salah', 'Bukayo Saka', 'Bernardo Silva', 'Phil Foden',
        'Federico Chiesa', 'Ousmane Dembélé', 'Antony', 'Serge Gnabry',
        'Raphinha', 'Riyad Mahrez', 'Jarrod Bowen', 'Bryan Mbeumo',
        // Legends
        'Lionel Messi', 'Cristiano Ronaldo', 'Arjen Robben', 'Gareth Bale',
        'David Beckham', 'Luis Figo', 'George Best', 'Ángel Di María'
      ],
    };

    // Get player pool for this position, fallback to ST if position not found
    const pool = playersByPosition[position] || playersByPosition['ST'];
    
    // Filter out already used names
    const availableNames = pool.filter(name => !this.usedPlayerNames.has(name));
    
    // If all names are used, allow duplicates (shouldn't happen with expanded pools)
    const finalPool = availableNames.length > 0 ? availableNames : pool;
    
    // Pick a random name from the pool
    const randomIndex = Math.floor(Math.random() * finalPool.length);
    const selectedName = finalPool[randomIndex];
    
    // Mark this name as used
    this.usedPlayerNames.add(selectedName);
    
    return selectedName;
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
